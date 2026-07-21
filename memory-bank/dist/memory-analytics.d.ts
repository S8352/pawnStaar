/**
 * Memory Analytics and Optimization System
 * Provides comprehensive monitoring, analytics, and optimization for the memory system
 */
import { MemoryManager } from './memory-manager';
import { ContextEngineer } from './context-engineer';
export interface MemoryMetrics {
    totalMemories: number;
    memoriesByType: Record<string, number>;
    memoriesByCategory: Record<string, number>;
    averageRelevanceScore: number;
    totalAccessCount: number;
    memoryGrowthRate: number;
    contextAssemblyTime: number;
    tokenUtilization: number;
    contextQuality: {
        completeness: number;
        relevance: number;
        efficiency: number;
    };
}
export interface PerformanceMetrics {
    retrievalTime: number;
    storageTime: number;
    contextAssemblyTime: number;
    tokenProcessingTime: number;
    memorySearchTime: number;
    averageResponseTime: number;
}
export interface OptimizationRecommendations {
    type: 'cleanup' | 'compression' | 'reorganization' | 'performance';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
    implementation: string;
}
export declare class MemoryAnalytics {
    private memoryManager;
    private contextEngineer;
    private metricsHistory;
    private performanceHistory;
    constructor(memoryManager: MemoryManager, contextEngineer: ContextEngineer);
    /**
     * Collect comprehensive memory metrics
     */
    collectMetrics(): Promise<MemoryMetrics>;
    /**
     * Measure performance metrics
     */
    measurePerformance(): Promise<PerformanceMetrics>;
    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations(): Promise<OptimizationRecommendations[]>;
    /**
     * Identify memory gaps and opportunities
     */
    identifyMemoryGaps(): Promise<string[]>;
    /**
     * Generate memory health report
     */
    generateHealthReport(): Promise<string>;
    /**
     * Calculate overall health score
     */
    private calculateHealthScore;
    /**
     * Group memories by type
     */
    private groupMemoriesByType;
    /**
     * Group memories by category
     */
    private groupMemoriesByCategory;
    /**
     * Calculate average relevance score
     */
    private calculateAverageRelevanceScore;
    /**
     * Calculate total access count
     */
    private calculateTotalAccessCount;
    /**
     * Calculate memory growth rate
     */
    private calculateMemoryGrowthRate;
    /**
     * Measure context assembly time
     */
    private measureContextAssemblyTime;
    /**
     * Calculate token utilization
     */
    private calculateTokenUtilization;
    /**
     * Assess context quality
     */
    private assessContextQuality;
    /**
     * Estimate token processing time
     */
    private estimateTokenProcessingTime;
    /**
     * Estimate memory search time
     */
    private estimateMemorySearchTime;
    /**
     * Trim metrics history to prevent memory bloat
     */
    private trimMetricsHistory;
    /**
     * Trim performance history to prevent memory bloat
     */
    private trimPerformanceHistory;
}
export declare const memoryAnalytics: MemoryAnalytics;
