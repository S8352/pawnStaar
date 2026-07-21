/**
 * Memory Optimizer for PawnStaar Chess Platform
 * Implements automated memory management, cleanup, and optimization strategies
 */
import { MemoryManager } from './memory-manager';
import { MemoryAnalytics } from './memory-analytics';
export interface OptimizationConfig {
    cleanup: {
        enabled: boolean;
        retentionDays: number;
        archiveThreshold: number;
    };
    compression: {
        enabled: boolean;
        similarityThreshold: number;
        maxGroupSize: number;
    };
    performance: {
        enabled: boolean;
        cacheSize: number;
        indexOptimization: boolean;
    };
    quality: {
        enabled: boolean;
        minRelevanceScore: number;
        maxUnusedDays: number;
    };
}
export interface OptimizationResult {
    type: 'cleanup' | 'compression' | 'reorganization' | 'performance';
    operationsPerformed: number;
    memoriesAffected: number;
    tokensSaved: number;
    performanceImprovement: number;
    qualityImprovement: number;
    details: string[];
}
export declare class MemoryOptimizer {
    private memoryManager;
    private analytics;
    private config;
    constructor(memoryManager: MemoryManager, analytics: MemoryAnalytics, config: OptimizationConfig);
    /**
     * Run comprehensive memory optimization
     */
    optimize(): Promise<OptimizationResult[]>;
    /**
     * Run cleanup optimization
     */
    private runCleanupOptimization;
    /**
     * Run compression optimization
     */
    private runCompressionOptimization;
    /**
     * Run performance optimization
     */
    private runPerformanceOptimization;
    /**
     * Run quality optimization
     */
    private runQualityOptimization;
    /**
     * Group similar memories for compression
     */
    private groupSimilarMemories;
    /**
     * Check if two memories are similar
     */
    private areMemoriesSimilar;
    /**
     * Calculate content similarity between two memories
     */
    private calculateContentSimilarity;
    /**
     * Create a summary from a group of similar memories
     */
    private createMemorySummary;
    /**
     * Combine content from multiple memories
     */
    private combineMemoryContent;
    /**
     * Replace a group of memories with a summary
     */
    private replaceGroupWithSummary;
    /**
     * Calculate token savings from compression
     */
    private calculateGroupTokenSavings;
    /**
     * Archive a memory
     */
    private archiveMemory;
    /**
     * Optimize memory indexing
     */
    private optimizeMemoryIndexing;
    /**
     * Implement memory caching
     */
    private implementMemoryCaching;
    /**
     * Optimize search algorithms
     */
    private optimizeSearchAlgorithms;
    /**
     * Estimate token count for content
     */
    private estimateTokenCount;
    /**
     * Update optimization configuration
     */
    updateConfig(newConfig: Partial<OptimizationConfig>): void;
    /**
     * Get current optimization configuration
     */
    getConfig(): OptimizationConfig;
}
export declare const memoryOptimizer: MemoryOptimizer;
//# sourceMappingURL=memory-optimizer.d.ts.map