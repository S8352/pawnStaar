/**
 * MCP Server for Memory Bank Integration
 * Provides memory operations as MCP tools for Cursor integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool, } from '@modelcontextprotocol/sdk/types.js';
import { MemoryManager, MemoryBlock } from './memory-manager.js';
import { ContextEngineer, ContextRequest } from './context-engineer.js';
export class MemoryBankMCPServer {
    server;
    memoryManager;
    contextEngineer;
    constructor() {
        this.server = new Server({
            name: 'memory-bank-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.memoryManager = new MemoryManager();
        this.contextEngineer = new ContextEngineer(this.memoryManager);
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'store_memory',
                        description: 'Store important information in memory bank',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: {
                                    type: 'string',
                                    description: 'The content to store in memory',
                                },
                                type: {
                                    type: 'string',
                                    enum: ['core', 'persistent', 'session', 'external'],
                                    description: 'Type of memory to store',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category for organizing the memory',
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Tags for categorizing the memory',
                                },
                            },
                            required: ['content', 'type'],
                        },
                    },
                    {
                        name: 'retrieve_memory',
                        description: 'Search memory bank for relevant information',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query for finding relevant memories',
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of memories to retrieve',
                                    default: 10,
                                },
                                type: {
                                    type: 'string',
                                    enum: ['core', 'persistent', 'session', 'external'],
                                    description: 'Filter by memory type',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'assemble_context',
                        description: 'Assemble optimal context for current task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                currentTask: {
                                    type: 'string',
                                    description: 'Description of the current task',
                                },
                                userQuery: {
                                    type: 'string',
                                    description: 'The user query or request',
                                },
                                activeFiles: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of currently active files',
                                },
                                recentMessages: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Recent conversation messages',
                                },
                                priorityCategories: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Priority categories for context assembly',
                                },
                            },
                            required: ['currentTask', 'userQuery'],
                        },
                    },
                    {
                        name: 'update_memory',
                        description: 'Update an existing memory block',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'ID of the memory to update',
                                },
                                content: {
                                    type: 'string',
                                    description: 'New content for the memory',
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Updated tags for the memory',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Updated category for the memory',
                                },
                            },
                            required: ['id'],
                        },
                    },
                    {
                        name: 'delete_memory',
                        description: 'Delete a memory block',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'ID of the memory to delete',
                                },
                            },
                            required: ['id'],
                        },
                    },
                    {
                        name: 'get_memory_stats',
                        description: 'Get statistics about the memory bank',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['core', 'persistent', 'session', 'external'],
                                    description: 'Filter stats by memory type',
                                },
                            },
                        },
                    },
                    {
                        name: 'cleanup_memory',
                        description: 'Clean up old or unused memories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                retentionDays: {
                                    type: 'number',
                                    description: 'Number of days to retain memories',
                                    default: 90,
                                },
                            },
                        },
                    },
                ],
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'store_memory':
                        return await this.handleStoreMemory(args);
                    case 'retrieve_memory':
                        return await this.handleRetrieveMemory(args);
                    case 'assemble_context':
                        return await this.handleAssembleContext(args);
                    case 'update_memory':
                        return await this.handleUpdateMemory(args);
                    case 'delete_memory':
                        return await this.handleDeleteMemory(args);
                    case 'get_memory_stats':
                        return await this.handleGetMemoryStats(args);
                    case 'cleanup_memory':
                        return await this.handleCleanupMemory(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        });
    }
    async handleStoreMemory(args) {
        const { content, type, category, tags } = args;
        const memoryId = await this.memoryManager.store({
            type,
            content,
            metadata: {
                created: new Date(),
                updated: new Date(),
                relevanceScore: 1.0,
                tags: tags || [],
                category: category || 'general',
                accessCount: 0,
                lastAccessed: new Date(),
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Memory stored successfully with ID: ${memoryId}`,
                },
            ],
        };
    }
    async handleRetrieveMemory(args) {
        const { query, limit, type } = args;
        let results;
        if (type) {
            const memories = await this.memoryManager.getMemoriesByType(type);
            results = memories
                .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
                .slice(0, limit || 10);
        }
        else {
            const searchResults = await this.memoryManager.retrieve(query, limit || 10);
            results = searchResults.map(r => r.memory);
        }
        const formattedResults = results.map(memory => `ID: ${memory.id}\nType: ${memory.type}\nCategory: ${memory.category}\nContent: ${memory.content}\nTags: ${memory.metadata.tags.join(', ')}\n---`).join('\n\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${results.length} memories:\n\n${formattedResults}`,
                },
            ],
        };
    }
    async handleAssembleContext(args) {
        const { currentTask, userQuery, activeFiles, recentMessages, priorityCategories } = args;
        const contextRequest = {
            currentTask,
            userQuery,
            activeFiles: activeFiles || [],
            recentMessages: recentMessages || [],
            priorityCategories: priorityCategories || [],
        };
        const contextResponse = await this.contextEngineer.assembleContext(contextRequest);
        return {
            content: [
                {
                    type: 'text',
                    text: `Assembled Context (${contextResponse.tokenUsage.total} tokens):\n\n${contextResponse.assembledContext}\n\n---\n\nContext Quality:\n- Completeness: ${(contextResponse.contextQuality.completeness * 100).toFixed(1)}%\n- Relevance: ${(contextResponse.contextQuality.relevance * 100).toFixed(1)}%\n- Efficiency: ${(contextResponse.contextQuality.efficiency * 100).toFixed(1)}%`,
                },
            ],
        };
    }
    async handleUpdateMemory(args) {
        const { id, content, tags, category } = args;
        const updates = {};
        if (content)
            updates.content = content;
        if (tags)
            updates.metadata = { tags };
        if (category)
            updates.metadata = { ...updates.metadata, category };
        await this.memoryManager.update(id, updates);
        return {
            content: [
                {
                    type: 'text',
                    text: `Memory ${id} updated successfully`,
                },
            ],
        };
    }
    async handleDeleteMemory(args) {
        const { id } = args;
        await this.memoryManager.delete(id);
        return {
            content: [
                {
                    type: 'text',
                    text: `Memory ${id} deleted successfully`,
                },
            ],
        };
    }
    async handleGetMemoryStats(args) {
        const { type } = args;
        let memories;
        if (type) {
            memories = await this.memoryManager.getMemoriesByType(type);
        }
        else {
            memories = await this.memoryManager.getAllMemories();
        }
        const stats = {
            total: memories.length,
            byType: memories.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + 1;
                return acc;
            }, {}),
            byCategory: memories.reduce((acc, m) => {
                acc[m.metadata.category] = (acc[m.metadata.category] || 0) + 1;
                return acc;
            }, {}),
            avgRelevanceScore: memories.reduce((sum, m) => sum + m.metadata.relevanceScore, 0) / memories.length,
            totalAccessCount: memories.reduce((sum, m) => sum + m.metadata.accessCount, 0),
        };
        return {
            content: [
                {
                    type: 'text',
                    text: `Memory Bank Statistics:\n\nTotal Memories: ${stats.total}\nBy Type: ${JSON.stringify(stats.byType, null, 2)}\nBy Category: ${JSON.stringify(stats.byCategory, null, 2)}\nAverage Relevance Score: ${stats.avgRelevanceScore.toFixed(2)}\nTotal Access Count: ${stats.totalAccessCount}`,
                },
            ],
        };
    }
    async handleCleanupMemory(args) {
        const { retentionDays } = args;
        await this.memoryManager.cleanup(retentionDays || 90);
        return {
            content: [
                {
                    type: 'text',
                    text: `Memory cleanup completed. Archived memories older than ${retentionDays || 90} days.`,
                },
            ],
        };
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Memory Bank MCP Server running on stdio');
    }
}
// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new MemoryBankMCPServer();
    server.run().catch(console.error);
}
//# sourceMappingURL=mcp-server.js.map