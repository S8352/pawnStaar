/**
 * MCP Server for Memory Bank Integration
 * Provides memory operations as MCP tools for Cursor integration
 */
export declare class MemoryBankMCPServer {
    private server;
    private memoryManager;
    private contextEngineer;
    constructor();
    private setupToolHandlers;
    private handleStoreMemory;
    private handleRetrieveMemory;
    private handleAssembleContext;
    private handleUpdateMemory;
    private handleDeleteMemory;
    private handleGetMemoryStats;
    private handleCleanupMemory;
    run(): Promise<void>;
}
