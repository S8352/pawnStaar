/**
 * PawnStaar Memory Scaffolding System
 * Main entry point for the memory system
 */

export { MemoryManager, memoryManager } from './memory-manager';
export { ContextEngineer, contextEngineer } from './context-engineer';
export { MemoryAnalytics, memoryAnalytics } from './memory-analytics';
export { MemoryOptimizer, memoryOptimizer } from './memory-optimizer';

// Re-export types
export type { MemoryBlock, MemorySearchResult, ContextAssembly } from './memory-manager';
export type { ContextRequest, ContextResponse } from './context-engineer';
export type { MemoryMetrics, PerformanceMetrics, OptimizationRecommendations } from './memory-analytics';
export type { OptimizationConfig, OptimizationResult } from './memory-optimizer';

console.log('🧠 PawnStaar Memory Scaffolding System loaded successfully!');

