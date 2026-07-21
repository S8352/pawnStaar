/**
 * Context Engineer for PawnStaar Chess Platform
 * Implements dynamic context assembly and intelligent information prioritization
 */

import { MemoryManager, type MemoryBlock, type ContextAssembly } from './memory-manager';

export interface ContextRequest {
  currentTask: string;
  userQuery: string;
  activeFiles: string[];
  recentMessages: string[];
  tokenBudget?: number;
  priorityCategories?: string[];
}

export interface ContextResponse {
  assembledContext: string;
  memoryBlocks: MemoryBlock[];
  tokenUsage: {
    total: number;
    core: number;
    persistent: number;
    session: number;
    external: number;
    system: number;
  };
  relevanceScores: Map<string, number>;
  contextQuality: {
    completeness: number;
    relevance: number;
    efficiency: number;
  };
}

export class ContextEngineer {
  private memoryManager: MemoryManager;
  private maxContextTokens: number;

  constructor(memoryManager: MemoryManager, maxContextTokens: number = 128000) {
    this.memoryManager = memoryManager;
    this.maxContextTokens = maxContextTokens;
  }

  /**
   * Assemble optimal context for AI interaction
   */
  async assembleContext(request: ContextRequest): Promise<ContextResponse> {
    const tokenBudget = request.tokenBudget || this.maxContextTokens;
    
    // Step 1: Load core context (always included)
    const coreContext = await this.loadCoreContext();
    
    // Step 2: Retrieve relevant memory
    const relevantMemory = await this.retrieveRelevantMemory(request);
    
    // Step 3: Build session context
    const sessionContext = await this.buildSessionContext(request);
    
    // Step 4: Add external knowledge if needed
    const externalContext = await this.loadExternalContext(request);
    
    // Step 5: Assemble and optimize context
    const assembledContext = await this.assembleAndOptimize({
      coreContext,
      relevantMemory,
      sessionContext,
      externalContext,
      tokenBudget,
      request
    });

    return assembledContext;
  }

  /**
   * Load core context (project overview, architecture, standards)
   */
  private async loadCoreContext(): Promise<MemoryBlock[]> {
    return await this.memoryManager.getMemoriesByType('core');
  }

  /**
   * Retrieve relevant memory based on current task
   */
  private async retrieveRelevantMemory(request: ContextRequest): Promise<MemoryBlock[]> {
    const searchQueries = this.buildSearchQueries(request);
    const allResults: MemoryBlock[] = [];

    for (const query of searchQueries) {
      const results = await this.memoryManager.retrieve(query, 10);
      allResults.push(...results.map(r => r.memory));
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = this.removeDuplicateMemories(allResults);
    return this.prioritizeMemories(uniqueResults, request);
  }

  /**
   * Build session context from current interaction
   */
  private async buildSessionContext(request: ContextRequest): Promise<MemoryBlock[]> {
    const sessionMemories: MemoryBlock[] = [];

    // Add current task context
    if (request.currentTask) {
      sessionMemories.push({
        id: 'current_task',
        type: 'session',
        content: `Current Task: ${request.currentTask}`,
        metadata: {
          created: new Date(),
          updated: new Date(),
          relevanceScore: 1.0,
          tags: ['current-task', 'session'],
          category: 'task',
          accessCount: 0,
          lastAccessed: new Date()
        }
      });
    }

    // Add active files context
    if (request.activeFiles.length > 0) {
      sessionMemories.push({
        id: 'active_files',
        type: 'session',
        content: `Active Files: ${request.activeFiles.join(', ')}`,
        metadata: {
          created: new Date(),
          updated: new Date(),
          relevanceScore: 0.8,
          tags: ['active-files', 'session'],
          category: 'files',
          accessCount: 0,
          lastAccessed: new Date()
        }
      });
    }

    // Add recent conversation context
    if (request.recentMessages.length > 0) {
      const recentContext = request.recentMessages.slice(-3).join('\n');
      sessionMemories.push({
        id: 'recent_context',
        type: 'session',
        content: `Recent Context:\n${recentContext}`,
        metadata: {
          created: new Date(),
          updated: new Date(),
          relevanceScore: 0.7,
          tags: ['recent-context', 'session'],
          category: 'conversation',
          accessCount: 0,
          lastAccessed: new Date()
        }
      });
    }

    return sessionMemories;
  }

  /**
   * Load external context (documentation, references)
   */
  private async loadExternalContext(request: ContextRequest): Promise<MemoryBlock[]> {
    // Only load external context if specifically requested or if core memory is insufficient
    const coreMemory = await this.loadCoreContext();
    const relevantMemory = await this.retrieveRelevantMemory(request);
    
    if (coreMemory.length + relevantMemory.length < 5) {
      return await this.memoryManager.getMemoriesByType('external');
    }
    
    return [];
  }

  /**
   * Assemble and optimize the final context
   */
  private async assembleAndOptimize(context: {
    coreContext: MemoryBlock[];
    relevantMemory: MemoryBlock[];
    sessionContext: MemoryBlock[];
    externalContext: MemoryBlock[];
    tokenBudget: number;
    request: ContextRequest;
  }): Promise<ContextResponse> {
    const { coreContext, relevantMemory, sessionContext, externalContext, tokenBudget, request } = context;
    
    // Calculate token allocation
    const tokenAllocation = this.calculateTokenAllocation(tokenBudget);
    
    // Select memories within token limits
    const selectedCore = this.selectMemoriesWithinLimit(coreContext, tokenAllocation.core);
    const selectedPersistent = this.selectMemoriesWithinLimit(relevantMemory, tokenAllocation.persistent);
    const selectedSession = this.selectMemoriesWithinLimit(sessionContext, tokenAllocation.session);
    const selectedExternal = this.selectMemoriesWithinLimit(externalContext, tokenAllocation.external);
    
    // Assemble context string
    const assembledContext = this.buildContextString({
      core: selectedCore,
      persistent: selectedPersistent,
      session: selectedSession,
      external: selectedExternal
    });
    
    // Calculate metrics
    const allMemories = [...selectedCore, ...selectedPersistent, ...selectedSession, ...selectedExternal];
    const tokenUsage = this.calculateTokenUsage(allMemories, tokenAllocation);
    const relevanceScores = this.calculateRelevanceScores(allMemories, request);
    const contextQuality = this.assessContextQuality(allMemories, request);
    
    return {
      assembledContext,
      memoryBlocks: allMemories,
      tokenUsage,
      relevanceScores,
      contextQuality
    };
  }

  /**
   * Build search queries from context request
   */
  private buildSearchQueries(request: ContextRequest): string[] {
    const queries: string[] = [];
    
    // Primary query from current task
    if (request.currentTask) {
      queries.push(request.currentTask);
    }
    
    // Secondary queries from user query
    if (request.userQuery) {
      queries.push(request.userQuery);
    }
    
    // Category-specific queries
    if (request.priorityCategories) {
      queries.push(...request.priorityCategories);
    }
    
    // File-based queries
    if (request.activeFiles.length > 0) {
      const fileTypes = request.activeFiles.map(file => {
        const ext = file.split('.').pop();
        return ext || 'unknown';
      });
      queries.push(...fileTypes);
    }
    
    return queries;
  }

  /**
   * Remove duplicate memories
   */
  private removeDuplicateMemories(memories: MemoryBlock[]): MemoryBlock[] {
    const seen = new Set<string>();
    return memories.filter(memory => {
      if (seen.has(memory.id)) {
        return false;
      }
      seen.add(memory.id);
      return true;
    });
  }

  /**
   * Prioritize memories based on relevance and importance
   */
  private prioritizeMemories(memories: MemoryBlock[], request: ContextRequest): MemoryBlock[] {
    return memories.sort((a, b) => {
      // Calculate composite score
      const scoreA = this.calculateCompositeScore(a, request);
      const scoreB = this.calculateCompositeScore(b, request);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate composite score for memory prioritization
   */
  private calculateCompositeScore(memory: MemoryBlock, request: ContextRequest): number {
    let score = memory.metadata.relevanceScore;
    
    // Boost score for priority categories
    if (request.priorityCategories?.includes(memory.metadata.category)) {
      score += 0.5;
    }
    
    // Boost score for recent access
    const daysSinceAccess = (Date.now() - memory.metadata.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 7) {
      score += 0.3;
    }
    
    // Boost score for high access count
    if (memory.metadata.accessCount > 5) {
      score += 0.2;
    }
    
    return score;
  }

  /**
   * Calculate token allocation for different context types
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
  private selectMemoriesWithinLimit(memories: MemoryBlock[], tokenLimit: number): MemoryBlock[] {
    const selected: MemoryBlock[] = [];
    let totalTokens = 0;

    for (const memory of memories) {
      const memoryTokens = this.estimateTokenCount(memory.content);
      if (totalTokens + memoryTokens <= tokenLimit) {
        selected.push(memory);
        totalTokens += memoryTokens;
      } else {
        // Try to add a compressed version
        const compressedContent = this.compressContent(memory.content, tokenLimit - totalTokens);
        if (compressedContent) {
          selected.push({
            ...memory,
            content: compressedContent
          });
        }
        break;
      }
    }

    return selected;
  }

  /**
   * Build the final context string
   */
  private buildContextString(context: {
    core: MemoryBlock[];
    persistent: MemoryBlock[];
    session: MemoryBlock[];
    external: MemoryBlock[];
  }): string {
    const sections: string[] = [];

    // Core context (always first)
    if (context.core.length > 0) {
      sections.push('# Core Context (Always Available)');
      sections.push(context.core.map(m => `## ${m.metadata.category}\n${m.content}`).join('\n\n'));
    }

    // Persistent memory
    if (context.persistent.length > 0) {
      sections.push('# Relevant Memory');
      sections.push(context.persistent.map(m => `## ${m.metadata.category}\n${m.content}`).join('\n\n'));
    }

    // Session context
    if (context.session.length > 0) {
      sections.push('# Current Session');
      sections.push(context.session.map(m => `## ${m.metadata.category}\n${m.content}`).join('\n\n'));
    }

    // External context
    if (context.external.length > 0) {
      sections.push('# External References');
      sections.push(context.external.map(m => `## ${m.metadata.category}\n${m.content}`).join('\n\n'));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Calculate token usage for different context types
   */
  private calculateTokenUsage(memories: MemoryBlock[], allocation: any) {
    const coreTokens = memories.filter(m => m.type === 'core').reduce((sum, m) => sum + this.estimateTokenCount(m.content), 0);
    const persistentTokens = memories.filter(m => m.type === 'persistent').reduce((sum, m) => sum + this.estimateTokenCount(m.content), 0);
    const sessionTokens = memories.filter(m => m.type === 'session').reduce((sum, m) => sum + this.estimateTokenCount(m.content), 0);
    const externalTokens = memories.filter(m => m.type === 'external').reduce((sum, m) => sum + this.estimateTokenCount(m.content), 0);

    return {
      total: coreTokens + persistentTokens + sessionTokens + externalTokens,
      core: coreTokens,
      persistent: persistentTokens,
      session: sessionTokens,
      external: externalTokens,
      system: allocation.system
    };
  }

  /**
   * Calculate relevance scores for all memories
   */
  private calculateRelevanceScores(memories: MemoryBlock[], request: ContextRequest): Map<string, number> {
    const scores = new Map<string, number>();
    
    for (const memory of memories) {
      const score = this.calculateCompositeScore(memory, request);
      scores.set(memory.id, score);
    }
    
    return scores;
  }

  /**
   * Assess context quality
   */
  private assessContextQuality(memories: MemoryBlock[], request: ContextRequest) {
    const totalMemories = memories.length;
    const coreMemories = memories.filter(m => m.type === 'core').length;
    const relevantMemories = memories.filter(m => m.type === 'persistent').length;
    
    // Completeness: How well we cover the request
    const completeness = Math.min(1.0, totalMemories / 10);
    
    // Relevance: How relevant the memories are to the request
    const avgRelevance = memories.reduce((sum, m) => sum + m.metadata.relevanceScore, 0) / totalMemories;
    const relevance = avgRelevance;
    
    // Efficiency: How well we use the available context
    const efficiency = totalMemories > 0 ? Math.min(1.0, (coreMemories + relevantMemories) / totalMemories) : 0;
    
    return { completeness, relevance, efficiency };
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Compress content to fit within token limit
   */
  private compressContent(content: string, maxTokens: number): string | null {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }
    
    // Simple compression: take first part and add truncation note
    const truncated = content.substring(0, maxChars - 100);
    return truncated + '\n\n[Content truncated for token limit]';
  }
}

// Export singleton instance
export const contextEngineer = new ContextEngineer(new MemoryManager());
