/**
 * Context Engineer for PawnStaar Chess Platform
 * Implements dynamic context assembly and intelligent information prioritization
 */
import { MemoryManager, MemoryBlock } from './memory-manager';
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
export declare class ContextEngineer {
    private memoryManager;
    private maxContextTokens;
    constructor(memoryManager: MemoryManager, maxContextTokens?: number);
    /**
     * Assemble optimal context for AI interaction
     */
    assembleContext(request: ContextRequest): Promise<ContextResponse>;
    /**
     * Load core context (project overview, architecture, standards)
     */
    private loadCoreContext;
    /**
     * Retrieve relevant memory based on current task
     */
    private retrieveRelevantMemory;
    /**
     * Build session context from current interaction
     */
    private buildSessionContext;
    /**
     * Load external context (documentation, references)
     */
    private loadExternalContext;
    /**
     * Assemble and optimize the final context
     */
    private assembleAndOptimize;
    /**
     * Build search queries from context request
     */
    private buildSearchQueries;
    /**
     * Remove duplicate memories
     */
    private removeDuplicateMemories;
    /**
     * Prioritize memories based on relevance and importance
     */
    private prioritizeMemories;
    /**
     * Calculate composite score for memory prioritization
     */
    private calculateCompositeScore;
    /**
     * Calculate token allocation for different context types
     */
    private calculateTokenAllocation;
    /**
     * Select memories within token limit
     */
    private selectMemoriesWithinLimit;
    /**
     * Build the final context string
     */
    private buildContextString;
    /**
     * Calculate token usage for different context types
     */
    private calculateTokenUsage;
    /**
     * Calculate relevance scores for all memories
     */
    private calculateRelevanceScores;
    /**
     * Assess context quality
     */
    private assessContextQuality;
    /**
     * Estimate token count for text
     */
    private estimateTokenCount;
    /**
     * Compress content to fit within token limit
     */
    private compressContent;
}
export declare const contextEngineer: ContextEngineer;
//# sourceMappingURL=context-engineer.d.ts.map