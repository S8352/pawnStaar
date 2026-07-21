#!/usr/bin/env tsx
/**
 * Memory System Health Check
 * Comprehensive health check for the memory scaffolding system
 */
import { MemoryManager } from './memory-manager';
import { ContextEngineer } from './context-engineer';
import { MemoryAnalytics } from './memory-analytics';
import { MemoryOptimizer } from './memory-optimizer';
import * as fs from 'fs/promises';
import * as path from 'path';
class MemoryHealthCheck {
    memoryManager;
    contextEngineer;
    analytics;
    optimizer;
    constructor() {
        this.memoryManager = new MemoryManager();
        this.contextEngineer = new ContextEngineer(this.memoryManager);
        this.analytics = new MemoryAnalytics(this.memoryManager, this.contextEngineer);
        this.optimizer = new MemoryOptimizer(this.memoryManager, this.analytics, {
            cleanup: { enabled: true, retentionDays: 90, archiveThreshold: 5 },
            compression: { enabled: true, similarityThreshold: 0.7, maxGroupSize: 3 },
            performance: { enabled: true, cacheSize: 1000, indexOptimization: true },
            quality: { enabled: true, minRelevanceScore: 0.3, maxUnusedDays: 30 }
        });
    }
    async runHealthCheck() {
        const results = [];
        console.log('🔍 Running Memory System Health Check...\n');
        // Check memory bank structure
        results.push(await this.checkMemoryBankStructure());
        // Check memory manager
        results.push(await this.checkMemoryManager());
        // Check context engineer
        results.push(await this.checkContextEngineer());
        // Check analytics system
        results.push(await this.checkAnalyticsSystem());
        // Check optimization system
        results.push(await this.checkOptimizationSystem());
        // Check MCP integration
        results.push(await this.checkMCPIntegration());
        // Check overall system health
        results.push(await this.checkOverallHealth());
        return results;
    }
    async checkMemoryBankStructure() {
        try {
            const requiredDirs = ['core', 'persistent', 'session', 'external'];
            const missingDirs = [];
            for (const dir of requiredDirs) {
                const dirPath = path.join('./memory-bank', dir);
                try {
                    await fs.access(dirPath);
                }
                catch {
                    missingDirs.push(dir);
                }
            }
            if (missingDirs.length > 0) {
                return {
                    component: 'Memory Bank Structure',
                    status: 'error',
                    message: `Missing required directories: ${missingDirs.join(', ')}`,
                    details: { missingDirs }
                };
            }
            // Check for core memory files
            const coreFiles = await fs.readdir('./memory-bank/core');
            if (coreFiles.length < 3) {
                return {
                    component: 'Memory Bank Structure',
                    status: 'warning',
                    message: 'Insufficient core memory files',
                    details: { coreFiles: coreFiles.length, expected: 3 }
                };
            }
            return {
                component: 'Memory Bank Structure',
                status: 'healthy',
                message: 'Memory bank structure is properly configured',
                details: { directories: requiredDirs, coreFiles: coreFiles.length }
            };
        }
        catch (error) {
            return {
                component: 'Memory Bank Structure',
                status: 'error',
                message: `Failed to check memory bank structure: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkMemoryManager() {
        try {
            // Test basic memory operations
            const testMemory = {
                type: 'session',
                content: 'Health check test memory',
                metadata: {
                    created: new Date(),
                    updated: new Date(),
                    relevanceScore: 1.0,
                    tags: ['health-check', 'test'],
                    category: 'test',
                    accessCount: 0,
                    lastAccessed: new Date()
                }
            };
            const memoryId = await this.memoryManager.store(testMemory);
            const retrievedMemory = await this.memoryManager.getMemoryById(memoryId);
            if (!retrievedMemory) {
                return {
                    component: 'Memory Manager',
                    status: 'error',
                    message: 'Failed to retrieve stored memory',
                    details: { memoryId }
                };
            }
            // Test search functionality
            const searchResults = await this.memoryManager.retrieve('health check', 5);
            if (searchResults.length === 0) {
                return {
                    component: 'Memory Manager',
                    status: 'warning',
                    message: 'Memory search not returning results',
                    details: { searchQuery: 'health check' }
                };
            }
            // Clean up test memory
            await this.memoryManager.delete(memoryId);
            return {
                component: 'Memory Manager',
                status: 'healthy',
                message: 'Memory manager is functioning correctly',
                details: {
                    operationsTested: ['store', 'retrieve', 'delete'],
                    searchResults: searchResults.length
                }
            };
        }
        catch (error) {
            return {
                component: 'Memory Manager',
                status: 'error',
                message: `Memory manager error: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkContextEngineer() {
        try {
            const contextRequest = {
                currentTask: 'Health check test',
                userQuery: 'Test context assembly',
                activeFiles: [],
                recentMessages: []
            };
            const contextResponse = await this.contextEngineer.assembleContext(contextRequest);
            if (!contextResponse.assembledContext) {
                return {
                    component: 'Context Engineer',
                    status: 'error',
                    message: 'Context assembly failed to produce content',
                    details: { contextRequest }
                };
            }
            if (contextResponse.tokenUsage.total === 0) {
                return {
                    component: 'Context Engineer',
                    status: 'warning',
                    message: 'Context assembly produced zero tokens',
                    details: { contextResponse }
                };
            }
            return {
                component: 'Context Engineer',
                status: 'healthy',
                message: 'Context engineer is functioning correctly',
                details: {
                    tokenUsage: contextResponse.tokenUsage,
                    contextQuality: contextResponse.contextQuality,
                    memoryBlocks: contextResponse.memoryBlocks.length
                }
            };
        }
        catch (error) {
            return {
                component: 'Context Engineer',
                status: 'error',
                message: `Context engineer error: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkAnalyticsSystem() {
        try {
            const metrics = await this.analytics.collectMetrics();
            const performance = await this.analytics.measurePerformance();
            const recommendations = await this.analytics.generateOptimizationRecommendations();
            if (metrics.totalMemories < 0) {
                return {
                    component: 'Analytics System',
                    status: 'error',
                    message: 'Invalid memory count in metrics',
                    details: { metrics }
                };
            }
            if (performance.averageResponseTime > 5000) {
                return {
                    component: 'Analytics System',
                    status: 'warning',
                    message: 'Performance metrics indicate slow response times',
                    details: { performance }
                };
            }
            return {
                component: 'Analytics System',
                status: 'healthy',
                message: 'Analytics system is functioning correctly',
                details: {
                    metrics,
                    performance,
                    recommendations: recommendations.length
                }
            };
        }
        catch (error) {
            return {
                component: 'Analytics System',
                status: 'error',
                message: `Analytics system error: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkOptimizationSystem() {
        try {
            const optimizationResults = await this.optimizer.optimize();
            if (optimizationResults.length === 0) {
                return {
                    component: 'Optimization System',
                    status: 'warning',
                    message: 'No optimization operations performed',
                    details: { optimizationResults }
                };
            }
            const totalOperations = optimizationResults.reduce((sum, result) => sum + result.operationsPerformed, 0);
            if (totalOperations === 0) {
                return {
                    component: 'Optimization System',
                    status: 'warning',
                    message: 'Optimization system ran but performed no operations',
                    details: { optimizationResults }
                };
            }
            return {
                component: 'Optimization System',
                status: 'healthy',
                message: 'Optimization system is functioning correctly',
                details: {
                    optimizationResults,
                    totalOperations
                }
            };
        }
        catch (error) {
            return {
                component: 'Optimization System',
                status: 'error',
                message: `Optimization system error: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkMCPIntegration() {
        try {
            // Check if MCP configuration exists
            const mcpConfigPath = './.cursor/mcp.json';
            try {
                await fs.access(mcpConfigPath);
                const mcpConfig = JSON.parse(await fs.readFile(mcpConfigPath, 'utf-8'));
                if (!mcpConfig.mcpServers || !mcpConfig.mcpServers['memory-bank']) {
                    return {
                        component: 'MCP Integration',
                        status: 'error',
                        message: 'MCP configuration missing memory-bank server',
                        details: { mcpConfig }
                    };
                }
                return {
                    component: 'MCP Integration',
                    status: 'healthy',
                    message: 'MCP integration is properly configured',
                    details: { mcpConfig }
                };
            }
            catch {
                return {
                    component: 'MCP Integration',
                    status: 'error',
                    message: 'MCP configuration file not found',
                    details: { mcpConfigPath }
                };
            }
        }
        catch (error) {
            return {
                component: 'MCP Integration',
                status: 'error',
                message: `MCP integration error: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    async checkOverallHealth() {
        try {
            const healthReport = await this.analytics.generateHealthReport();
            // Parse health score from report
            const healthScoreMatch = healthReport.match(/Health Score\s+(\d+\.?\d*)\/100/);
            const healthScore = healthScoreMatch ? parseFloat(healthScoreMatch[1]) : 0;
            if (healthScore < 50) {
                return {
                    component: 'Overall System Health',
                    status: 'error',
                    message: `System health score is critically low: ${healthScore}/100`,
                    details: { healthScore, healthReport }
                };
            }
            if (healthScore < 80) {
                return {
                    component: 'Overall System Health',
                    status: 'warning',
                    message: `System health score is below optimal: ${healthScore}/100`,
                    details: { healthScore, healthReport }
                };
            }
            return {
                component: 'Overall System Health',
                status: 'healthy',
                message: `System health score is good: ${healthScore}/100`,
                details: { healthScore, healthReport }
            };
        }
        catch (error) {
            return {
                component: 'Overall System Health',
                status: 'error',
                message: `Failed to assess overall health: ${error}`,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    printResults(results) {
        console.log('📊 Health Check Results:\n');
        for (const result of results) {
            const icon = result.status === 'healthy' ? '✅' :
                result.status === 'warning' ? '⚠️' : '❌';
            console.log(`${icon} ${result.component}: ${result.message}`);
            if (result.details) {
                console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
            }
            console.log();
        }
        const healthyCount = results.filter(r => r.status === 'healthy').length;
        const warningCount = results.filter(r => r.status === 'warning').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        console.log(`📈 Summary: ${healthyCount} healthy, ${warningCount} warnings, ${errorCount} errors`);
        if (errorCount > 0) {
            console.log('\n🚨 System has critical issues that need attention!');
            process.exit(1);
        }
        else if (warningCount > 0) {
            console.log('\n⚠️  System has warnings but is functional.');
        }
        else {
            console.log('\n🎉 System is healthy and fully functional!');
        }
    }
}
// Run health check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const healthCheck = new MemoryHealthCheck();
    healthCheck.runHealthCheck()
        .then(results => {
        const healthCheckInstance = new MemoryHealthCheck();
        healthCheckInstance.printResults(results);
    })
        .catch(error => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=health-check.js.map