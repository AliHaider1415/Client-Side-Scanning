import { Upload } from "lucide-react"

export const Header = () => {
    return (
        <header className="border-b border-border/40 bg-background sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">NudgeScan</h1>
              <p className="text-xs text-muted-foreground">Client-Side Scanner</p>
            </div>
          </div>
        </div>
      </header>
    )
}