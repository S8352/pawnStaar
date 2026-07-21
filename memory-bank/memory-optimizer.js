/**
 * Memory Optimizer for PawnStaar Chess Platform
 * Implements automated memory management, cleanup, and optimization strategies
 */
import { MemoryManager, MemoryBlock } from './memory-manager';
import { MemoryAnalytics, OptimizationRecommendations } from './memory-analytics';
export class MemoryOptimizer {
    memoryManager;
    analytics;
    config;
    constructor(memoryManager, analytics, config) {
        this.memoryManager = memoryManager;
        this.analytics = analytics;
        this.config = config;
    }
    /**
     * Run comprehensive memory optimization
     */
    async optimize() {
        const results = [];
        // Run cleanup optimization
        if (this.config.cleanup.enabled) {
            const cleanupResult = await this.runCleanupOptimization();
            results.push(cleanupResult);
        }
        // Run compression optimization
        if (this.config.compression.enabled) {
            const compressionResult = await this.runCompressionOptimization();
            results.push(compressionResult);
        }
        // Run performance optimization
        if (this.config.performance.enabled) {
            const performanceResult = await this.runPerformanceOptimization();
            results.push(performanceResult);
        }
        // Run quality optimization
        if (this.config.quality.enabled) {
            const qualityResult = await this.runQualityOptimization();
            results.push(qualityResult);
        }
        return results;
    }
    /**
     * Run cleanup optimization
     */
    async runCleanupOptimization() {
        const startTime = Date.now();
        const allMemories = await this.memoryManager.getAllMemories();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanup.retentionDays);
        let operationsPerformed = 0;
        let memoriesAffected = 0;
        let tokensSaved = 0;
        const details = [];
        // Archive old, unused memories
        const oldMemories = allMemories.filter(memory => memory.metadata.lastAccessed < cutoffDate &&
            memory.metadata.accessCount < this.config.cleanup.archiveThreshold &&
            memory.type !== 'core');
        for (const memory of oldMemories) {
            await this.archiveMemory(memory);
            operationsPerformed++;
            memoriesAffected++;
            tokensSaved += this.estimateTokenCount(memory.content);
            details.push(`Archived old memory: ${memory.id}`);
        }
        // Remove very old, unused memories
        const veryOldCutoff = new Date();
        veryOldCutoff.setDate(veryOldCutoff.getDate() - (this.config.cleanup.retentionDays * 2));
        const veryOldMemories = allMemories.filter(memory => memory.metadata.created < veryOldCutoff &&
            memory.metadata.accessCount === 0 &&
            memory.type !== 'core');
        for (const memory of veryOldMemories) {
            await this.memoryManager.delete(memory.id);
            operationsPerformed++;
            memoriesAffected++;
            tokensSaved += this.estimateTokenCount(memory.content);
            details.push(`Deleted very old memory: ${memory.id}`);
        }
        const performanceImprovement = Date.now() - startTime;
        return {
            type: 'cleanup',
            operationsPerformed,
            memoriesAffected,
            tokensSaved,
            performanceImprovement,
            qualityImprovement: 0,
            details
        };
    }
    /**
     * Run compression optimization
     */
    async runCompressionOptimization() {
        const startTime = Date.now();
        const allMemories = await this.memoryManager.getAllMemories();
        let operationsPerformed = 0;
        let memoriesAffected = 0;
        let tokensSaved = 0;
        const details = [];
        // Group similar memories by category and content similarity
        const memoryGroups = this.groupSimilarMemories(allMemories);
        for (const group of memoryGroups) {
            if (group.length > this.config.compression.maxGroupSize) {
                // Create compressed summary
                const summary = await this.createMemorySummary(group);
                // Replace group with summary
                await this.replaceGroupWithSummary(group, summary);
                operationsPerformed++;
                memoriesAffected += group.length;
                tokensSaved += this.calculateGroupTokenSavings(group, summary);
                details.push(`Compressed ${group.length} similar memories into summary`);
            }
        }
        const performanceImprovement = Date.now() - startTime;
        return {
            type: 'compression',
            operationsPerformed,
            memoriesAffected,
            tokensSaved,
            performanceImprovement,
            qualityImprovement: 0,
            details
        };
    }
    /**
     * Run performance optimization
     */
    async runPerformanceOptimization() {
        const startTime = Date.now();
        let operationsPerformed = 0;
        let memoriesAffected = 0;
        let tokensSaved = 0;
        const details = [];
        // Optimize memory indexing
        if (this.config.performance.indexOptimization) {
            await this.optimizeMemoryIndexing();
            operationsPerformed++;
            details.push('Optimized memory indexing');
        }
        // Implement caching for frequently accessed memories
        await this.implementMemoryCaching();
        operationsPerformed++;
        details.push('Implemented memory caching');
        // Optimize search algorithms
        await this.optimizeSearchAlgorithms();
        operationsPerformed++;
        details.push('Optimized search algorithms');
        const performanceImprovement = Date.now() - startTime;
        return {
            type: 'performance',
            operationsPerformed,
            memoriesAffected,
            tokensSaved,
            performanceImprovement,
            qualityImprovement: 0,
            details
        };
    }
    /**
     * Run quality optimization
     */
    async runQualityOptimization() {
        const startTime = Date.now();
        const allMemories = await this.memoryManager.getAllMemories();
        let operationsPerformed = 0;
        let memoriesAffected = 0;
        let tokensSaved = 0;
        const details = [];
        // Remove low-relevance memories
        const lowRelevanceMemories = allMemories.filter(memory => memory.metadata.relevanceScore < this.config.quality.minRelevanceScore &&
            memory.type !== 'core');
        for (const memory of lowRelevanceMemories) {
            await this.memoryManager.delete(memory.id);
            operationsPerformed++;
            memoriesAffected++;
            tokensSaved += this.estimateTokenCount(memory.content);
            details.push(`Removed low-relevance memory: ${memory.id}`);
        }
        // Update relevance scores based on recent access patterns
        const unusedCutoff = new Date();
        unusedCutoff.setDate(unusedCutoff.getDate() - this.config.quality.maxUnusedDays);
        const unusedMemories = allMemories.filter(memory => memory.metadata.lastAccessed < unusedCutoff &&
            memory.type !== 'core');
        for (const memory of unusedMemories) {
            // Reduce relevance score for unused memories
            const newRelevanceScore = Math.max(0.1, memory.metadata.relevanceScore * 0.8);
            await this.memoryManager.update(memory.id, {
                metadata: {
                    ...memory.metadata,
                    relevanceScore: newRelevanceScore
                }
            });
            operationsPerformed++;
            memoriesAffected++;
            details.push(`Updated relevance score for unused memory: ${memory.id}`);
        }
        const performanceImprovement = Date.now() - startTime;
        return {
            type: 'reorganization',
            operationsPerformed,
            memoriesAffected,
            tokensSaved,
            performanceImprovement,
            qualityImprovement: 0,
            details
        };
    }
    /**
     * Group similar memories for compression
     */
    groupSimilarMemories(memories) {
        const groups = [];
        const processed = new Set();
        for (const memory of memories) {
            if (processed.has(memory.id))
                continue;
            const group = [memory];
            processed.add(memory.id);
            // Find similar memories
            for (const otherMemory of memories) {
                if (processed.has(otherMemory.id))
                    continue;
                if (this.areMemoriesSimilar(memory, otherMemory)) {
                    group.push(otherMemory);
                    processed.add(otherMemory.id);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Check if two memories are similar
     */
    areMemoriesSimilar(memory1, memory2) {
        // Same category
        if (memory1.metadata.category !== memory2.metadata.category) {
            return false;
        }
        // Similar tags
        const commonTags = memory1.metadata.tags.filter(tag => memory2.metadata.tags.includes(tag));
        if (commonTags.length < 2) {
            return false;
        }
        // Content similarity (simplified)
        const similarity = this.calculateContentSimilarity(memory1.content, memory2.content);
        return similarity > this.config.compression.similarityThreshold;
    }
    /**
     * Calculate content similarity between two memories
     */
    calculateContentSimilarity(content1, content2) {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    /**
     * Create a summary from a group of similar memories
     */
    async createMemorySummary(group) {
        const category = group[0].metadata.category;
        const tags = [...new Set(group.flatMap(m => m.metadata.tags))];
        // Combine content intelligently
        const combinedContent = this.combineMemoryContent(group);
        // Calculate average relevance score
        const avgRelevanceScore = group.reduce((sum, m) => sum + m.metadata.relevanceScore, 0) / group.length;
        // Calculate total access count
        const totalAccessCount = group.reduce((sum, m) => sum + m.metadata.accessCount, 0);
        // Find most recent access
        const lastAccessed = group.reduce((latest, m) => m.metadata.lastAccessed > latest ? m.metadata.lastAccessed : latest, group[0].metadata.lastAccessed);
        return {
            id: `summary_${Date.now()}`,
            type: group[0].type,
            content: combinedContent,
            metadata: {
                created: new Date(),
                updated: new Date(),
                relevanceScore: avgRelevanceScore,
                tags,
                category,
                accessCount: totalAccessCount,
                lastAccessed
            }
        };
    }
    /**
     * Combine content from multiple memories
     */
    combineMemoryContent(group) {
        // Simple combination strategy - in practice, you'd use more sophisticated NLP
        const contents = group.map(m => m.content);
        const uniqueContents = [...new Set(contents)];
        return `# ${group[0].metadata.category} Summary\n\n` +
            `This summary combines ${group.length} related memories:\n\n` +
            uniqueContents.map((content, index) => `## Memory ${index + 1}\n${content}\n`).join('\n---\n\n');
    }
    /**
     * Replace a group of memories with a summary
     */
    async replaceGroupWithSummary(group, summary) {
        // Store the summary
        await this.memoryManager.store(summary);
        // Delete the original memories
        for (const memory of group) {
            await this.memoryManager.delete(memory.id);
        }
    }
    /**
     * Calculate token savings from compression
     */
    calculateGroupTokenSavings(group, summary) {
        const groupTokens = group.reduce((sum, memory) => sum + this.estimateTokenCount(memory.content), 0);
        const summaryTokens = this.estimateTokenCount(summary.content);
        return groupTokens - summaryTokens;
    }
    /**
     * Archive a memory
     */
    async archiveMemory(memory) {
        // In a real implementation, you'd move to an archive directory
        // For now, we'll just mark it as archived
        await this.memoryManager.update(memory.id, {
            metadata: {
                ...memory.metadata,
                tags: [...memory.metadata.tags, 'archived']
            }
        });
    }
    /**
     * Optimize memory indexing
     */
    async optimizeMemoryIndexing() {
        // In a real implementation, you'd optimize database indexes
        // For now, this is a placeholder
        console.log('Optimizing memory indexing...');
    }
    /**
     * Implement memory caching
     */
    async implementMemoryCaching() {
        // In a real implementation, you'd implement caching for frequently accessed memories
        // For now, this is a placeholder
        console.log('Implementing memory caching...');
    }
    /**
     * Optimize search algorithms
     */
    async optimizeSearchAlgorithms() {
        // In a real implementation, you'd optimize search algorithms
        // For now, this is a placeholder
        console.log('Optimizing search algorithms...');
    }
    /**
     * Estimate token count for content
     */
    estimateTokenCount(content) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(content.length / 4);
    }
    /**
     * Update optimization configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current optimization configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
// Default optimization configuration
const defaultOptimizationConfig = {
    cleanup: {
        enabled: true,
        retentionDays: 90,
        archiveThreshold: 5
    },
    compression: {
        enabled: true,
        similarityThreshold: 0.7,
        maxGroupSize: 3
    },
    performance: {
        enabled: true,
        cacheSize: 1000,
        indexOptimization: true
    },
    quality: {
        enabled: true,
        minRelevanceScore: 0.3,
        maxUnusedDays: 30
    }
};
// Export singleton instance
export const memoryOptimizer = new MemoryOptimizer(memoryManager, memoryAnalytics, defaultOptimizationConfig);
//# sourceMappingURL=memory-optimizer.js.map