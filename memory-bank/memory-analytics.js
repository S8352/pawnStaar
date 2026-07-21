/**
 * Memory Analytics and Optimization System
 * Provides comprehensive monitoring, analytics, and optimization for the memory system
 */
import { MemoryManager, MemoryBlock } from './memory-manager';
import { ContextEngineer, ContextResponse } from './context-engineer';
export class MemoryAnalytics {
    memoryManager;
    contextEngineer;
    metricsHistory = [];
    performanceHistory = [];
    constructor(memoryManager, contextEngineer) {
        this.memoryManager = memoryManager;
        this.contextEngineer = contextEngineer;
    }
    /**
     * Collect comprehensive memory metrics
     */
    async collectMetrics() {
        const startTime = Date.now();
        // Get all memories
        const allMemories = await this.memoryManager.getAllMemories();
        // Calculate basic metrics
        const totalMemories = allMemories.length;
        const memoriesByType = this.groupMemoriesByType(allMemories);
        const memoriesByCategory = this.groupMemoriesByCategory(allMemories);
        // Calculate relevance and access metrics
        const averageRelevanceScore = this.calculateAverageRelevanceScore(allMemories);
        const totalAccessCount = this.calculateTotalAccessCount(allMemories);
        // Calculate growth rate
        const memoryGrowthRate = this.calculateMemoryGrowthRate();
        // Measure context assembly performance
        const contextAssemblyTime = await this.measureContextAssemblyTime();
        // Calculate token utilization
        const tokenUtilization = await this.calculateTokenUtilization();
        // Assess context quality
        const contextQuality = await this.assessContextQuality();
        const metrics = {
            totalMemories,
            memoriesByType,
            memoriesByCategory,
            averageRelevanceScore,
            totalAccessCount,
            memoryGrowthRate,
            contextAssemblyTime,
            tokenUtilization,
            contextQuality
        };
        // Store metrics history
        this.metricsHistory.push(metrics);
        this.trimMetricsHistory();
        return metrics;
    }
    /**
     * Measure performance metrics
     */
    async measurePerformance() {
        const startTime = Date.now();
        // Measure retrieval time
        const retrievalStart = Date.now();
        await this.memoryManager.retrieve('test query', 10);
        const retrievalTime = Date.now() - retrievalStart;
        // Measure storage time
        const storageStart = Date.now();
        await this.memoryManager.store({
            type: 'session',
            content: 'Performance test memory',
            metadata: {
                created: new Date(),
                updated: new Date(),
                relevanceScore: 1.0,
                tags: ['performance-test'],
                category: 'test',
                accessCount: 0,
                lastAccessed: new Date()
            }
        });
        const storageTime = Date.now() - storageStart;
        // Measure context assembly time
        const contextStart = Date.now();
        await this.contextEngineer.assembleContext({
            currentTask: 'Performance test',
            userQuery: 'Test query',
            activeFiles: [],
            recentMessages: []
        });
        const contextAssemblyTime = Date.now() - contextStart;
        // Calculate other metrics
        const tokenProcessingTime = this.estimateTokenProcessingTime();
        const memorySearchTime = this.estimateMemorySearchTime();
        const averageResponseTime = (retrievalTime + storageTime + contextAssemblyTime) / 3;
        const performance = {
            retrievalTime,
            storageTime,
            contextAssemblyTime,
            tokenProcessingTime,
            memorySearchTime,
            averageResponseTime
        };
        // Store performance history
        this.performanceHistory.push(performance);
        this.trimPerformanceHistory();
        return performance;
    }
    /**
     * Generate optimization recommendations
     */
    async generateOptimizationRecommendations() {
        const recommendations = [];
        const metrics = await this.collectMetrics();
        // Check for memory cleanup needs
        if (metrics.totalMemories > 1000) {
            recommendations.push({
                type: 'cleanup',
                priority: 'high',
                description: 'Memory bank has grown large, consider archiving old memories',
                expectedImpact: 'Reduce memory overhead and improve performance',
                implementation: 'Run cleanup with 90-day retention policy'
            });
        }
        // Check for low relevance scores
        if (metrics.averageRelevanceScore < 0.5) {
            recommendations.push({
                type: 'reorganization',
                priority: 'medium',
                description: 'Average relevance score is low, consider improving memory organization',
                expectedImpact: 'Improve context quality and relevance',
                implementation: 'Review and update memory categorization and tagging'
            });
        }
        // Check for token utilization issues
        if (metrics.tokenUtilization > 0.9) {
            recommendations.push({
                type: 'compression',
                priority: 'high',
                description: 'Token utilization is high, implement compression strategies',
                expectedImpact: 'Reduce token usage and improve efficiency',
                implementation: 'Implement content compression and summarization'
            });
        }
        // Check for performance issues
        if (metrics.contextAssemblyTime > 2000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                description: 'Context assembly is slow, optimize performance',
                expectedImpact: 'Improve response times and user experience',
                implementation: 'Implement caching and optimize search algorithms'
            });
        }
        // Check for context quality issues
        if (metrics.contextQuality.efficiency < 0.7) {
            recommendations.push({
                type: 'reorganization',
                priority: 'medium',
                description: 'Context efficiency is low, optimize memory organization',
                expectedImpact: 'Improve context assembly efficiency',
                implementation: 'Reorganize memory structure and improve indexing'
            });
        }
        return recommendations;
    }
    /**
     * Identify memory gaps and opportunities
     */
    async identifyMemoryGaps() {
        const gaps = [];
        const allMemories = await this.memoryManager.getAllMemories();
        // Check for missing core memories
        const coreMemories = allMemories.filter(m => m.type === 'core');
        if (coreMemories.length < 5) {
            gaps.push('Insufficient core memories - add more project overview and architecture information');
        }
        // Check for missing persistent memories
        const persistentMemories = allMemories.filter(m => m.type === 'persistent');
        if (persistentMemories.length < 10) {
            gaps.push('Insufficient persistent memories - add more patterns and decisions');
        }
        // Check for category coverage
        const categories = new Set(allMemories.map(m => m.metadata.category));
        const expectedCategories = ['architecture', 'coding', 'chess', 'user-experience', 'performance'];
        const missingCategories = expectedCategories.filter(cat => !categories.has(cat));
        if (missingCategories.length > 0) {
            gaps.push(`Missing memory categories: ${missingCategories.join(', ')}`);
        }
        // Check for low-access memories
        const lowAccessMemories = allMemories.filter(m => m.metadata.accessCount === 0);
        if (lowAccessMemories.length > allMemories.length * 0.3) {
            gaps.push('Many memories have never been accessed - consider improving relevance or removing unused memories');
        }
        return gaps;
    }
    /**
     * Generate memory health report
     */
    async generateHealthReport() {
        const metrics = await this.collectMetrics();
        const performance = await this.measurePerformance();
        const recommendations = await this.generateOptimizationRecommendations();
        const gaps = await this.identifyMemoryGaps();
        const report = `
# Memory System Health Report
Generated: ${new Date().toISOString()}

## System Overview
- Total Memories: ${metrics.totalMemories}
- Average Relevance Score: ${metrics.averageRelevanceScore.toFixed(2)}
- Total Access Count: ${metrics.totalAccessCount}
- Memory Growth Rate: ${metrics.memoryGrowthRate.toFixed(2)}%

## Performance Metrics
- Context Assembly Time: ${metrics.contextAssemblyTime}ms
- Token Utilization: ${(metrics.tokenUtilization * 100).toFixed(1)}%
- Average Response Time: ${performance.averageResponseTime.toFixed(2)}ms

## Context Quality
- Completeness: ${(metrics.contextQuality.completeness * 100).toFixed(1)}%
- Relevance: ${(metrics.contextQuality.relevance * 100).toFixed(1)}%
- Efficiency: ${(metrics.contextQuality.efficiency * 100).toFixed(1)}%

## Memory Distribution
### By Type
${Object.entries(metrics.memoriesByType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

### By Category
${Object.entries(metrics.memoriesByCategory).map(([category, count]) => `- ${category}: ${count}`).join('\n')}

## Optimization Recommendations
${recommendations.map(rec => `
### ${rec.type.toUpperCase()} (${rec.priority.toUpperCase()})
- **Description**: ${rec.description}
- **Expected Impact**: ${rec.expectedImpact}
- **Implementation**: ${rec.implementation}
`).join('\n')}

## Memory Gaps
${gaps.map(gap => `- ${gap}`).join('\n')}

## Health Score
${this.calculateHealthScore(metrics, performance, recommendations, gaps).toFixed(1)}/100
`;
        return report;
    }
    /**
     * Calculate overall health score
     */
    calculateHealthScore(metrics, performance, recommendations, gaps) {
        let score = 100;
        // Deduct points for performance issues
        if (metrics.contextAssemblyTime > 2000)
            score -= 20;
        if (metrics.tokenUtilization > 0.9)
            score -= 15;
        if (performance.averageResponseTime > 1000)
            score -= 10;
        // Deduct points for quality issues
        if (metrics.contextQuality.efficiency < 0.7)
            score -= 15;
        if (metrics.contextQuality.relevance < 0.7)
            score -= 10;
        if (metrics.averageRelevanceScore < 0.5)
            score -= 10;
        // Deduct points for recommendations
        const highPriorityRecs = recommendations.filter(r => r.priority === 'high').length;
        score -= highPriorityRecs * 5;
        // Deduct points for gaps
        score -= gaps.length * 3;
        return Math.max(0, score);
    }
    /**
     * Group memories by type
     */
    groupMemoriesByType(memories) {
        return memories.reduce((acc, memory) => {
            acc[memory.type] = (acc[memory.type] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Group memories by category
     */
    groupMemoriesByCategory(memories) {
        return memories.reduce((acc, memory) => {
            const category = memory.metadata.category;
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Calculate average relevance score
     */
    calculateAverageRelevanceScore(memories) {
        if (memories.length === 0)
            return 0;
        const totalScore = memories.reduce((sum, memory) => sum + memory.metadata.relevanceScore, 0);
        return totalScore / memories.length;
    }
    /**
     * Calculate total access count
     */
    calculateTotalAccessCount(memories) {
        return memories.reduce((sum, memory) => sum + memory.metadata.accessCount, 0);
    }
    /**
     * Calculate memory growth rate
     */
    calculateMemoryGrowthRate() {
        if (this.metricsHistory.length < 2)
            return 0;
        const current = this.metricsHistory[this.metricsHistory.length - 1];
        const previous = this.metricsHistory[this.metricsHistory.length - 2];
        if (previous.totalMemories === 0)
            return 0;
        return ((current.totalMemories - previous.totalMemories) / previous.totalMemories) * 100;
    }
    /**
     * Measure context assembly time
     */
    async measureContextAssemblyTime() {
        const startTime = Date.now();
        await this.contextEngineer.assembleContext({
            currentTask: 'Performance measurement',
            userQuery: 'Test query for performance measurement',
            activeFiles: [],
            recentMessages: []
        });
        return Date.now() - startTime;
    }
    /**
     * Calculate token utilization
     */
    async calculateTokenUtilization() {
        // This is a simplified calculation - in practice, you'd measure actual token usage
        const allMemories = await this.memoryManager.getAllMemories();
        const totalTokens = allMemories.reduce((sum, memory) => {
            return sum + Math.ceil(memory.content.length / 4); // Rough token estimation
        }, 0);
        const maxTokens = 128000; // Maximum context window
        return Math.min(1, totalTokens / maxTokens);
    }
    /**
     * Assess context quality
     */
    async assessContextQuality() {
        // This is a simplified assessment - in practice, you'd measure actual context quality
        const allMemories = await this.memoryManager.getAllMemories();
        const completeness = Math.min(1, allMemories.length / 50); // Target 50 memories
        const relevance = this.calculateAverageRelevanceScore(allMemories);
        const efficiency = Math.min(1, allMemories.filter(m => m.metadata.accessCount > 0).length / allMemories.length);
        return { completeness, relevance, efficiency };
    }
    /**
     * Estimate token processing time
     */
    estimateTokenProcessingTime() {
        // Simplified estimation based on content length
        return 50; // ms
    }
    /**
     * Estimate memory search time
     */
    estimateMemorySearchTime() {
        // Simplified estimation based on memory count
        return 100; // ms
    }
    /**
     * Trim metrics history to prevent memory bloat
     */
    trimMetricsHistory() {
        if (this.metricsHistory.length > 100) {
            this.metricsHistory = this.metricsHistory.slice(-100);
        }
    }
    /**
     * Trim performance history to prevent memory bloat
     */
    trimPerformanceHistory() {
        if (this.performanceHistory.length > 100) {
            this.performanceHistory = this.performanceHistory.slice(-100);
        }
    }
}
// Export singleton instance
export const memoryAnalytics = new MemoryAnalytics(memoryManager, contextEngineer);
//# sourceMappingURL=memory-analytics.js.map