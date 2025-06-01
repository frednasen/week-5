// src/app/settings/page.tsx

'use client'

import { useSettings } from '@/lib/contexts/SettingsContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchAllTabsData, getCampaigns } from '@/lib/sheetsData'
import { CURRENCY_OPTIONS } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const router = useRouter()
  const {
    settings,
    setCurrency,
    refreshData,
    isDataLoading: isContextLoading,
    dataError: contextError,
    projects,
    addProject,
    removeProject,
    setActiveProject,
    activeProject
  } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  // Add Project form state
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUrl, setNewProjectUrl] = useState('')

  useEffect(() => {
    if (contextError) {
      setError('Error loading initial data. Check URL or network.');
    }
  }, [contextError]);

  const handleUpdate = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      await refreshData()
      router.push('/')
    } catch (err) {
      console.error('Error updating data:', err)
      setError('Failed to update data. Please check your Sheet URL or network connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || !newProjectUrl.trim()) return
    addProject({ name: newProjectName.trim(), url: newProjectUrl.trim() })
    setNewProjectName('')
    setNewProjectUrl('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 py-12 mt-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-12">Settings</h1>

          <Card className="p-6 bg-white shadow-sm">
            <div className="space-y-8">
              {/* Add New Project */}
              <form onSubmit={handleAddProject} className="space-y-2">
                <div className="font-semibold text-lg">Add New Project</div>
                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <Input
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="h-12"
                  />
                  <Input
                    value={newProjectUrl}
                    onChange={e => setNewProjectUrl(e.target.value)}
                    placeholder="Enter Google Sheet URL"
                    className="h-12"
                  />
                  <Button
                    type="submit"
                    className="h-12 px-8 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold"
                  >
                    + Add Project
                  </Button>
                </div>
              </form>

              {/* Project Dropdown */}
              {projects.length > 0 && (
                <div>
                  <Label className="text-base font-semibold mb-2 block">Select Project</Label>
                  <Select
                    value={activeProject?.url || ''}
                    onValueChange={setActiveProject}
                  >
                    <SelectTrigger className="h-12 w-full max-w-xl">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.url} value={project.url} className="flex flex-col items-start">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-gray-500 truncate max-w-xs">{project.url}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Projects List */}
              <div>
                <div className="font-semibold text-lg mb-2">Projects</div>
                <div className="space-y-3">
                  {projects.length === 0 && (
                    <div className="text-gray-500 text-sm">No projects added yet.</div>
                  )}
                  {projects.map(project => (
                    <div
                      key={project.url}
                      className={`flex items-center justify-between rounded-lg border p-4 ${activeProject?.url === project.url ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {project.name}
                          {activeProject?.url === project.url && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500 text-white">Active</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{project.url}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-100"
                        onClick={() => removeProject(project.url)}
                        title="Remove project"
                        type="button"
                      >
                        <span className="sr-only">Remove</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency selection (unchanged) */}
              <div>
                <Label className="text-base">Currency</Label>
                <div className="mt-2">
                  <Select value={settings.currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-12 w-[200px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={handleUpdate}
                  disabled={isLoading || isContextLoading || !activeProject?.url}
                  className="w-full h-12 text-lg bg-[#ea580c] hover:bg-[#c2410c] text-white"
                >
                  {isLoading || isContextLoading ? (
                    'Updating...'
                  ) : (
                    <span className="flex items-center gap-2">
                      Update & View Dashboard
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 