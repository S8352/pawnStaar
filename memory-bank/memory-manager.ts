/**
 * Memory Manager for PawnStaar Chess Platform
 * Implements robust memory scaffolding with persistent storage and intelligent retrieval
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface MemoryBlock {
  id: string;
  type: 'core' | 'persistent' | 'session' | 'external';
  content: string;
  metadata: {
    created: Date;
    updated: Date;
    relevanceScore: number;
    tags: string[];
    category: string;
    accessCount: number;
    lastAccessed: Date;
  };
}

export interface MemorySearchResult {
  memory: MemoryBlock;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'tag' | 'category';
}

export interface ContextAssembly {
  coreMemory: MemoryBlock[];
  persistentMemory: MemoryBlock[];
  sessionMemory: MemoryBlock[];
  externalMemory: MemoryBlock[];
  totalTokens: number;
  tokenBudget: {
    core: number;
    persistent: number;
    session: number;
    external: number;
    system: number;
  };
}

export class MemoryManager {
  private memoryBankRoot: string;
  private tokenBudget: number;
  private maxContextTokens: number;

  constructor(memoryBankRoot: string = './memory-bank', maxContextTokens: number = 128000) {
    this.memoryBankRoot = memoryBankRoot;
    this.maxContextTokens = maxContextTokens;
    this.tokenBudget = maxContextTokens;
  }

  /**
   * Store a memory block in the appropriate directory
   */
  async store(memory: Omit<MemoryBlock, 'id' | 'metadata'> & { tags?: string[]; category?: string }): Promise<string> {
    const id = this.generateMemoryId(memory.content, memory.type);
    const now = new Date();
    
    const memoryBlock: MemoryBlock = {
      ...memory,
      id,
      metadata: {
        created: now,
        updated: now,
        relevanceScore: 1.0,
        tags: memory.tags || [],
        category: memory.category || 'general',
        accessCount: 0,
        lastAccessed: now
      }
    };

    const filePath = this.getMemoryFilePath(memory.type, id);
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(memoryBlock, null, 2));

    return id;
  }

  /**
   * Retrieve memories based on query with relevance scoring
   */
  async retrieve(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const allMemories = await this.getAllMemories();
    const results: MemorySearchResult[] = [];

    for (const memory of allMemories) {
      const relevanceScore = this.calculateRelevanceScore(memory, query);
      if (relevanceScore > 0.1) { // Minimum relevance threshold
        results.push({
          memory,
          relevanceScore,
          matchType: this.determineMatchType(memory, query)
        });
      }
    }

    // Sort by relevance score and limit results
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Update an existing memory block
   */
  async update(id: string, updates: Partial<MemoryBlock>): Promise<void> {
    const memory = await this.getMemoryById(id);
    if (!memory) {
      throw new Error(`Memory with id ${id} not found`);
    }

    const updatedMemory: MemoryBlock = {
      ...memory,
      ...updates,
      metadata: {
        ...memory.metadata,
        ...updates.metadata,
        updated: new Date()
      }
    };

    const filePath = this.getMemoryFilePath(memory.type, id);
    await fs.writeFile(filePath, JSON.stringify(updatedMemory, null, 2));
  }

  /**
   * Delete a memory block
   */
  async delete(id: string): Promise<void> {
    const memory = await this.getMemoryById(id);
    if (!memory) {
      throw new Error(`Memory with id ${id} not found`);
    }

    const filePath = this.getMemoryFilePath(memory.type, id);
    await fs.unlink(filePath);
  }

  /**
   * Assemble context for AI interaction
   */
  async assembleContext(currentTask: string, tokenBudget?: number): Promise<ContextAssembly> {
    const budget = tokenBudget || this.tokenBudget;
    const tokenAllocation = this.calculateTokenAllocation(budget);

    const [coreMemory, persistentMemory, sessionMemory, externalMemory] = await Promise.all([
      this.getCoreMemory(tokenAllocation.core),
      this.getRelevantPersistentMemory(currentTask, tokenAllocation.persistent),
      this.getSessionMemory(tokenAllocation.session),
      this.getRelevantExternalMemory(currentTask, tokenAllocation.external)
    ]);

    const totalTokens = this.estimateTokenCount([
      ...coreMemory,
      ...persistentMemory,
      ...sessionMemory,
      ...externalMemory
    ]);

    return {
      coreMemory,
      persistentMemory,
      sessionMemory,
      externalMemory,
      totalTokens,
      tokenBudget: tokenAllocation
    };
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string): Promise<MemoryBlock | null> {
    const allMemories = await this.getAllMemories();
    return allMemories.find(m => m.id === id) || null;
  }

  /**
   * Get all memories of a specific type
   */
  async getMemoriesByType(type: MemoryBlock['type']): Promise<MemoryBlock[]> {
    const allMemories = await this.getAllMemories();
    return allMemories.filter(m => m.type === type);
  }

  /**
   * Clean up old or unused memories
   */
  async cleanup(retentionDays: number = 90): Promise<void> {
    const allMemories = await this.getAllMemories();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const memory of allMemories) {
      const shouldArchive = 
        memory.metadata.lastAccessed < cutoffDate &&
        memory.metadata.accessCount === 0 &&
        memory.type !== 'core';

      if (shouldArchive) {
        await this.archiveMemory(memory);
      }
    }
  }

  /**
   * Archive a memory block
   */
  private async archiveMemory(memory: MemoryBlock): Promise<void> {
    const archivePath = path.join(this.memoryBankRoot, 'archived', `${memory.id}.json`);
    await this.ensureDirectoryExists(path.dirname(archivePath));
    await fs.writeFile(archivePath, JSON.stringify(memory, null, 2));
    await this.delete(memory.id);
  }

  /**
   * Get all memories from all directories
   */
  async getAllMemories(): Promise<MemoryBlock[]> {
    const memories: MemoryBlock[] = [];
    const types: MemoryBlock['type'][] = ['core', 'persistent', 'session', 'external'];

    for (const type of types) {
      const typeMemories = await this.getMemoriesFromDirectory(type);
      memories.push(...typeMemories);
    }

    return memories;
  }

  /**
   * Get memories from a specific directory
   */
  private async getMemoriesFromDirectory(type: MemoryBlock['type']): Promise<MemoryBlock[]> {
    const dirPath = path.join(this.memoryBankRoot, type);
    
    try {
      const files = await fs.readdir(dirPath);
      const memories: MemoryBlock[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const memory: MemoryBlock = JSON.parse(content);
            memories.push(memory);
          } catch (error) {
            console.warn(`Failed to parse memory file ${file}:`, error);
          }
        }
      }

      return memories;
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  }

  /**
   * Get core memory (always in context)
   */
  private async getCoreMemory(tokenLimit: number): Promise<MemoryBlock[]> {
    const coreMemories = await this.getMemoriesFromDirectory('core');
    return this.selectMemoriesWithinTokenLimit(coreMemories, tokenLimit);
  }

  /**
   * Get relevant persistent memory
   */
  private async getRelevantPersistentMemory(query: string, tokenLimit: number): Promise<MemoryBlock[]> {
    const persistentMemories = await this.getMemoriesFromDirectory('persistent');
    const relevantMemories = await this.retrieve(query, 20);
    const persistentResults = relevantMemories
      .filter(result => result.memory.type === 'persistent')
      .map(result => result.memory);
    
    return this.selectMemoriesWithinTokenLimit(persistentResults, tokenLimit);
  }

  /**
   * Get session memory
   */
  private async getSessionMemory(tokenLimit: number): Promise<MemoryBlock[]> {
    const sessionMemories = await this.getMemoriesFromDirectory('session');
    return this.selectMemoriesWithinTokenLimit(sessionMemories, tokenLimit);
  }

  /**
   * Get relevant external memory
   */
  private async getRelevantExternalMemory(query: string, tokenLimit: number): Promise<MemoryBlock[]> {
    const externalMemories = await this.getMemoriesFromDirectory('external');
    const relevantMemories = await this.retrieve(query, 10);
    const externalResults = relevantMemories
      .filter(result => result.memory.type === 'external')
      .map(result => result.memory);
    
    return this.selectMemoriesWithinTokenLimit(externalResults, tokenLimit);
  }

  /**
   * Calculate relevance score for a memory block
   */
  private calculateRelevanceScore(memory: MemoryBlock, query: string): number {
    let score = 0;

    // Recency factor (newer = higher score)
    const ageDays = (Date.now() - memory.metadata.created.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - ageDays * 0.5);

    // Text similarity (simple keyword matching for now)
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = memory.content.toLowerCase().split(/\s+/);
    const tagWords = memory.metadata.tags.map(tag => tag.toLowerCase());
    
    const contentMatches = queryWords.filter(word => contentWords.includes(word)).length;
    const tagMatches = queryWords.filter(word => tagWords.includes(word)).length;
    
    score += (contentMatches / queryWords.length) * 10;
    score += (tagMatches / queryWords.length) * 5;

    // Access frequency
    score += memory.metadata.accessCount * 0.1;

    // Category relevance
    if (memory.metadata.category && query.toLowerCase().includes(memory.metadata.category.toLowerCase())) {
      score += 5;
    }

    return score;
  }

  /**
   * Determine match type for search results
   */
  private determineMatchType(memory: MemoryBlock, query: string): MemorySearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    
    if (contentLower.includes(queryLower)) {
      return 'exact';
    }
    
    if (memory.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      return 'tag';
    }
    
    if (memory.metadata.category.toLowerCase().includes(queryLower)) {
      return 'category';
    }
    
    return 'semantic';
  }

  /**
   * Calculate token allocation for context assembly
   */
  private calculateTokenAllocation(totalBudget: number) {
    return {
      core: Math.floor(totalBudget * 0.25),
      persistent: Math.floor(totalBudget * 0.20),
      session: Math.floor(totalBudget * 0.35),
      external: Math.floor(totalBudget * 0.15),
      system: Math.floor(totalBudget * 0.05)
    };
  }

  /**
   * Select memories within token limit
   */
  private selectMemoriesWithinTokenLimit(memories: MemoryBlock[], tokenLimit: number): MemoryBlock[] {
    const selected: MemoryBlock[] = [];
    let totalTokens = 0;

    for (const memory of memories) {
      const memoryTokens = this.estimateTokenCount([memory]);
      if (totalTokens + memoryTokens <= tokenLimit) {
        selected.push(memory);
        totalTokens += memoryTokens;
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Estimate token count for memory blocks
   */
  private estimateTokenCount(memories: MemoryBlock[]): number {
    const totalChars = memories.reduce((sum, memory) => sum + memory.content.length, 0);
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(content: string, type: string): string {
    const hash = createHash('md5').update(content + type + Date.now().toString()).digest('hex');
    return `${type}_${hash.substring(0, 8)}`;
  }

  /**
   * Get file path for memory block
   */
  private getMemoryFilePath(type: MemoryBlock['type'], id: string): string {
    return path.join(this.memoryBankRoot, type, `${id}.json`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
