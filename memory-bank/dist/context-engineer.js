/**
 * Context Engineer for PawnStaar Chess Platform
 * Implements dynamic context assembly and intelligent information prioritization
 */
import { MemoryManager } from './memory-manager';
export class ContextEngineer {
    memoryManager;
    maxContextTokens;
    constructor(memoryManager, maxContextTokens = 128000) {
        this.memoryManager = memoryManager;
        this.maxContextTokens = maxContextTokens;
    }
    /**
     * Assemble optimal context for AI interaction
     */
    async assembleContext(request) {
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
    async loadCoreContext() {
        return await this.memoryManager.getMemoriesByType('core');
    }
    /**
     * Retrieve relevant memory based on current task
     */
    async retrieveRelevantMemory(request) {
        const searchQueries = this.buildSearchQueries(request);
        const allResults = [];
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
    async buildSessionContext(request) {
        const sessionMemories = [];
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
    async loadExternalContext(request) {
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
    async assembleAndOptimize(context) {
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
    buildSearchQueries(request) {
        const queries = [];
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
    removeDuplicateMemories(memories) {
        const seen = new Set();
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
    prioritizeMemories(memories, request) {
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
    calculateCompositeScore(memory, request) {
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
    calculateTokenAllocation(totalBudget) {
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
    selectMemoriesWithinLimit(memories, tokenLimit) {
        const selected = [];
        let totalTokens = 0;
        for (const memory of memories) {
            const memoryTokens = this.estimateTokenCount(memory.content);
            if (totalTokens + memoryTokens <= tokenLimit) {
                selected.push(memory);
                totalTokens += memoryTokens;
            }
            else {
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
    buildContextString(context) {
        const sections = [];
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
    calculateTokenUsage(memories, allocation) {
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
    calculateRelevanceScores(memories, request) {
        const scores = new Map();
        for (const memory of memories) {
            const score = this.calculateCompositeScore(memory, request);
            scores.set(memory.id, score);
        }
        return scores;
    }
    /**
     * Assess context quality
     */
    assessContextQuality(memories, request) {
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
    estimateTokenCount(text) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
    /**
     * Compress content to fit within token limit
     */
    compressContent(content, maxTokens) {
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
//# sourceMappingURL=context-engineer.js.map