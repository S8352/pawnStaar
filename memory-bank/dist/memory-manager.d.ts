/**
 * Memory Manager for PawnStaar Chess Platform
 * Implements robust memory scaffolding with persistent storage and intelligent retrieval
 */
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
export declare class MemoryManager {
    private memoryBankRoot;
    private tokenBudget;
    private maxContextTokens;
    constructor(memoryBankRoot?: string, maxContextTokens?: number);
    /**
     * Store a memory block in the appropriate directory
     */
    store(memory: Omit<MemoryBlock, 'id' | 'metadata'> & {
        tags?: string[];
        category?: string;
    }): Promise<string>;
    /**
     * Retrieve memories based on query with relevance scoring
     */
    retrieve(query: string, limit?: number): Promise<MemorySearchResult[]>;
    /**
     * Update an existing memory block
     */
    update(id: string, updates: Partial<MemoryBlock>): Promise<void>;
    /**
     * Delete a memory block
     */
    delete(id: string): Promise<void>;
    /**
     * Assemble context for AI interaction
     */
    assembleContext(currentTask: string, tokenBudget?: number): Promise<ContextAssembly>;
    /**
     * Get memory by ID
     */
    getMemoryById(id: string): Promise<MemoryBlock | null>;
    /**
     * Get all memories of a specific type
     */
    getMemoriesByType(type: MemoryBlock['type']): Promise<MemoryBlock[]>;
    /**
     * Clean up old or unused memories
     */
    cleanup(retentionDays?: number): Promise<void>;
    /**
     * Archive a memory block
     */
    private archiveMemory;
    /**
     * Get all memories from all directories
     */
    getAllMemories(): Promise<MemoryBlock[]>;
    /**
     * Get memories from a specific directory
     */
    private getMemoriesFromDirectory;
    /**
     * Get core memory (always in context)
     */
    private getCoreMemory;
    /**
     * Get relevant persistent memory
     */
    private getRelevantPersistentMemory;
    /**
     * Get session memory
     */
    private getSessionMemory;
    /**
     * Get relevant external memory
     */
    private getRelevantExternalMemory;
    /**
     * Calculate relevance score for a memory block
     */
    private calculateRelevanceScore;
    /**
     * Determine match type for search results
     */
    private determineMatchType;
    /**
     * Calculate token allocation for context assembly
     */
    private calculateTokenAllocation;
    /**
     * Select memories within token limit
     */
    private selectMemoriesWithinTokenLimit;
    /**
     * Estimate token count for memory blocks
     */
    private estimateTokenCount;
    /**
     * Generate unique memory ID
     */
    private generateMemoryId;
    /**
     * Get file path for memory block
     */
    private getMemoryFilePath;
    /**
     * Ensure directory exists
     */
    private ensureDirectoryExists;
}
export declare const memoryManager: MemoryManager;
