export interface PropPathConfig {
  directories: string[]
  projectRoot: string
}

export interface AblMcpConfig {
  projectRoot: string
  schemaDirs: string[]
  propath: string[]
  databases: Record<string, string>
  ccs?: {
    basePackage?: string
    outputDir?: string
  }
}
