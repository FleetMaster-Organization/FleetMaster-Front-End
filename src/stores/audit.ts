import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<any[]>([])
    const isLoading = ref(false)

    function log(..._args: any[]) {
        // No-op: Audit module has been removed
    }

    async function loadLogs() {
        // No-op: Audit module has been removed
    }

    return { logs, isLoading, log, loadLogs }
})