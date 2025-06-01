// src/lib/contexts/SettingsContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import type { Campaign, Settings, TabData } from '../types'
import { DEFAULT_SHEET_URL } from '../config'
import { fetchAllTabsData, getCampaigns } from '../sheetsData'

export type Project = {
  name: string
  url: string
}

export type SettingsContextType = {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  setSheetUrl: (url: string) => void
  setCurrency: (currency: string) => void
  setSelectedCampaign: (campaignId: string) => void
  fetchedData: TabData | undefined
  dataError: any
  isDataLoading: boolean
  refreshData: () => void
  campaigns: Campaign[]
  projects: Project[]
  addProject: (project: Project) => void
  removeProject: (url: string) => void
  setActiveProject: (url: string) => void
  activeProject: Project | undefined
}

const defaultSettings: Settings = {
  sheetUrl: DEFAULT_SHEET_URL,
  currency: '$',
  selectedCampaign: undefined,
  activeTab: 'daily'
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectUrl, setActiveProjectUrl] = useState<string | undefined>(undefined)

  // Load settings, projects, and active project from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        delete parsedSettings.campaigns
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch {
        setSettings(defaultSettings)
      }
    }
    // Load projects
    const savedProjects = localStorage.getItem('projects')
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects))
      } catch {
        setProjects([])
      }
    }
    // Load active project
    const savedActive = localStorage.getItem('activeProjectUrl')
    if (savedActive) {
      setActiveProjectUrl(savedActive)
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const { campaigns, ...settingsToSave } = settings as any
    localStorage.setItem('settings', JSON.stringify(settingsToSave))
  }, [settings])

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects))
  }, [projects])

  // Save active project url to localStorage
  useEffect(() => {
    if (activeProjectUrl) {
      localStorage.setItem('activeProjectUrl', activeProjectUrl)
    }
  }, [activeProjectUrl])

  // When activeProjectUrl changes, update sheetUrl in settings
  useEffect(() => {
    if (activeProjectUrl) {
      setSettings(prev => ({ ...prev, sheetUrl: activeProjectUrl }))
    }
  }, [activeProjectUrl])

  // Fetch data using useSWR based on sheetUrl
  const { data: fetchedData, error: dataError, isLoading: isDataLoading, mutate: refreshData } = useSWR<TabData>(
    settings.sheetUrl ? settings.sheetUrl : null,
    fetchAllTabsData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  // Calculate campaigns based on fetchedData
  const campaigns = useMemo(() => {
    return fetchedData?.daily ? getCampaigns(fetchedData.daily) : []
  }, [fetchedData])

  const setSheetUrl = (url: string) => {
    setSettings(prev => ({ ...prev, sheetUrl: url }))
  }

  const setCurrency = (currency: string) => {
    setSettings(prev => ({ ...prev, currency }))
  }

  const setSelectedCampaign = (id: string) => {
    setSettings(prev => ({ ...prev, selectedCampaign: id }))
  }

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  // Project management methods
  const addProject = (project: Project) => {
    setProjects(prev => {
      // Prevent duplicates by URL
      if (prev.some(p => p.url === project.url)) return prev
      return [...prev, project]
    })
    setActiveProjectUrl(project.url)
  }
  const removeProject = (url: string) => {
    setProjects(prev => prev.filter(p => p.url !== url))
    // If removing the active project, reset active
    if (activeProjectUrl === url) {
      setActiveProjectUrl(undefined)
    }
  }
  const setActiveProject = (url: string) => {
    setActiveProjectUrl(url)
  }
  const activeProject = projects.find(p => p.url === activeProjectUrl)

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      setSheetUrl,
      setCurrency,
      setSelectedCampaign,
      fetchedData,
      dataError,
      isDataLoading,
      refreshData: () => refreshData(),
      campaigns,
      projects,
      addProject,
      removeProject,
      setActiveProject,
      activeProject
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
} 