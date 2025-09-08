// Advanced Component Library for App Builder
// Sophisticated, configurable components with rich metadata

export const componentCategories = {
  input: {
    name: 'Input & Data',
    icon: 'fas fa-keyboard',
    color: '#3b82f6',
    description: 'Components for collecting user input and data'
  },
  processing: {
    name: 'Logic & Processing',
    icon: 'fas fa-microchip',
    color: '#8b5cf6',
    description: 'Components for data transformation and logic'
  },
  output: {
    name: 'Display & Output',
    icon: 'fas fa-eye',
    color: '#10b981',
    description: 'Components for displaying results and data'
  },
  interaction: {
    name: 'User Interaction',
    icon: 'fas fa-hand-pointer',
    color: '#f59e0b',
    description: 'Interactive elements and controls'
  },
  ai: {
    name: 'AI & Intelligence',
    icon: 'fas fa-brain',
    color: '#ec4899',
    description: 'AI-powered components and smart features'
  },
  integration: {
    name: 'External Services',
    icon: 'fas fa-plug',
    color: '#6366f1',
    description: 'Third-party integrations and APIs'
  }
}

export const advancedComponents = {
  // INPUT & DATA CATEGORY
  'smart-text-input': {
    id: 'smart-text-input',
    name: 'Smart Text Input',
    category: 'input',
    icon: 'fas fa-keyboard',
    description: 'Intelligent text input with validation, autocomplete, and formatting',
    tags: ['input', 'text', 'validation', 'smart'],
    difficulty: 'beginner',
    estimatedSetupTime: '2 minutes',
    properties: {
      label: { type: 'text', default: 'Enter text', description: 'Field label' },
      placeholder: { type: 'text', default: 'Type here...', description: 'Placeholder text' },
      validation: { 
        type: 'select', 
        options: ['none', 'email', 'phone', 'url', 'custom'], 
        default: 'none',
        description: 'Input validation type'
      },
      autocomplete: { type: 'boolean', default: true, description: 'Enable smart autocomplete' },
      formatting: { 
        type: 'select', 
        options: ['none', 'currency', 'date', 'phone'], 
        default: 'none',
        description: 'Auto-formatting style'
      },
      maxLength: { type: 'number', default: 255, min: 1, max: 10000, description: 'Maximum character length' },
      required: { type: 'boolean', default: false, description: 'Mark as required field' }
    },
    outputs: ['text_value', 'is_valid', 'validation_errors'],
    preview: {
      width: 300,
      height: 80,
      showInPalette: true
    }
  },

  'file-dropzone': {
    id: 'file-dropzone',
    name: 'Advanced File Upload',
    category: 'input',
    icon: 'fas fa-cloud-upload-alt',
    description: 'Drag-and-drop file upload with preview, progress, and validation',
    tags: ['upload', 'file', 'drag-drop', 'preview'],
    difficulty: 'intermediate',
    estimatedSetupTime: '5 minutes',
    properties: {
      allowedTypes: { 
        type: 'multiselect', 
        options: ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.txt'], 
        default: ['image/*'],
        description: 'Allowed file types'
      },
      maxFileSize: { type: 'number', default: 10, min: 1, max: 1000, unit: 'MB', description: 'Maximum file size' },
      maxFiles: { type: 'number', default: 1, min: 1, max: 100, description: 'Maximum number of files' },
      showPreview: { type: 'boolean', default: true, description: 'Show file previews' },
      compressionQuality: { type: 'slider', min: 0.1, max: 1.0, default: 0.8, description: 'Image compression quality' },
      uploadEndpoint: { type: 'text', default: '/api/upload', description: 'Upload API endpoint' }
    },
    outputs: ['uploaded_files', 'upload_progress', 'upload_errors'],
    preview: {
      width: 400,
      height: 200,
      showInPalette: true
    }
  },

  'data-table-input': {
    id: 'data-table-input',
    name: 'Interactive Data Table',
    category: 'input',
    icon: 'fas fa-table',
    description: 'Editable data table with sorting, filtering, and validation',
    tags: ['table', 'data', 'editable', 'sorting'],
    difficulty: 'advanced',
    estimatedSetupTime: '10 minutes',
    properties: {
      columns: { 
        type: 'array', 
        itemType: 'object',
        default: [
          { name: 'Name', type: 'text', editable: true },
          { name: 'Age', type: 'number', editable: true }
        ],
        description: 'Table column configuration'
      },
      allowAdd: { type: 'boolean', default: true, description: 'Allow adding new rows' },
      allowDelete: { type: 'boolean', default: true, description: 'Allow deleting rows' },
      sortable: { type: 'boolean', default: true, description: 'Enable column sorting' },
      filterable: { type: 'boolean', default: true, description: 'Enable row filtering' },
      exportFormats: { 
        type: 'multiselect', 
        options: ['csv', 'excel', 'json', 'pdf'], 
        default: ['csv', 'json'],
        description: 'Available export formats'
      }
    },
    outputs: ['table_data', 'selected_rows', 'validation_errors'],
    preview: {
      width: 600,
      height: 300,
      showInPalette: false
    }
  },

  // PROCESSING & LOGIC CATEGORY
  'ai-text-processor': {
    id: 'ai-text-processor',
    name: 'AI Text Processor',
    category: 'ai',
    icon: 'fas fa-robot',
    description: 'Advanced AI text processing with sentiment, translation, and summarization',
    tags: ['ai', 'nlp', 'processing', 'smart'],
    difficulty: 'intermediate',
    estimatedSetupTime: '8 minutes',
    properties: {
      operations: { 
        type: 'multiselect', 
        options: ['sentiment', 'translation', 'summarization', 'keywords', 'entities'], 
        default: ['sentiment'],
        description: 'AI processing operations'
      },
      targetLanguage: { 
        type: 'select', 
        options: ['auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'], 
        default: 'auto',
        description: 'Target language for translation'
      },
      confidenceThreshold: { type: 'slider', min: 0.1, max: 1.0, default: 0.7, description: 'Minimum confidence threshold' },
      apiProvider: { 
        type: 'select', 
        options: ['openai', 'claude', 'huggingface', 'google'], 
        default: 'openai',
        description: 'AI service provider'
      }
    },
    inputs: ['text_input'],
    outputs: ['processed_text', 'confidence_score', 'metadata'],
    preview: {
      width: 350,
      height: 150,
      showInPalette: true
    }
  },

  'data-transformer': {
    id: 'data-transformer',
    name: 'Advanced Data Transformer',
    category: 'processing',
    icon: 'fas fa-exchange-alt',
    description: 'Transform data between formats with custom mapping and validation',
    tags: ['transform', 'mapping', 'validation', 'format'],
    difficulty: 'advanced',
    estimatedSetupTime: '12 minutes',
    properties: {
      inputFormat: { 
        type: 'select', 
        options: ['json', 'csv', 'xml', 'yaml', 'custom'], 
        default: 'json',
        description: 'Input data format'
      },
      outputFormat: { 
        type: 'select', 
        options: ['json', 'csv', 'xml', 'yaml', 'custom'], 
        default: 'json',
        description: 'Output data format'
      },
      transformationRules: { 
        type: 'code', 
        language: 'javascript',
        default: '// Transform function\nreturn data.map(item => ({ ...item, processed: true }))',
        description: 'Custom transformation logic'
      },
      validateOutput: { type: 'boolean', default: true, description: 'Validate output data' },
      errorHandling: { 
        type: 'select', 
        options: ['strict', 'lenient', 'ignore'], 
        default: 'lenient',
        description: 'Error handling strategy'
      }
    },
    inputs: ['raw_data'],
    outputs: ['transformed_data', 'validation_results', 'processing_errors'],
    preview: {
      width: 400,
      height: 180,
      showInPalette: true
    }
  },

  'workflow-condition': {
    id: 'workflow-condition',
    name: 'Smart Condition Gate',
    category: 'processing',
    icon: 'fas fa-code-branch',
    description: 'Advanced conditional logic with multiple criteria and smart evaluation',
    tags: ['condition', 'logic', 'branching', 'smart'],
    difficulty: 'intermediate',
    estimatedSetupTime: '6 minutes',
    properties: {
      conditions: { 
        type: 'array', 
        itemType: 'object',
        default: [
          { field: 'value', operator: '>', value: 10, type: 'number' }
        ],
        description: 'Conditional criteria'
      },
      logicalOperator: { 
        type: 'select', 
        options: ['AND', 'OR', 'NOT'], 
        default: 'AND',
        description: 'Logic between conditions'
      },
      customLogic: { 
        type: 'code', 
        language: 'javascript',
        default: '// Custom condition logic\nreturn data.value > 10 && data.active === true',
        description: 'Advanced custom logic'
      },
      fallbackBehavior: { 
        type: 'select', 
        options: ['stop', 'continue', 'error'], 
        default: 'continue',
        description: 'Behavior when condition fails'
      }
    },
    inputs: ['input_data'],
    outputs: ['condition_result', 'matched_data', 'failed_data'],
    preview: {
      width: 300,
      height: 120,
      showInPalette: true
    }
  },

  // OUTPUT & DISPLAY CATEGORY
  'advanced-chart': {
    id: 'advanced-chart',
    name: 'Interactive Chart Suite',
    category: 'output',
    icon: 'fas fa-chart-line',
    description: 'Beautiful, interactive charts with real-time updates and customization',
    tags: ['chart', 'visualization', 'interactive', 'realtime'],
    difficulty: 'intermediate',
    estimatedSetupTime: '7 minutes',
    properties: {
      chartType: { 
        type: 'select', 
        options: ['line', 'bar', 'pie', 'scatter', 'heatmap', 'gauge', 'treemap'], 
        default: 'line',
        description: 'Chart visualization type'
      },
      theme: { 
        type: 'select', 
        options: ['light', 'dark', 'minimal', 'vibrant', 'custom'], 
        default: 'light',
        description: 'Chart visual theme'
      },
      animations: { type: 'boolean', default: true, description: 'Enable chart animations' },
      interactivity: { 
        type: 'multiselect', 
        options: ['zoom', 'pan', 'selection', 'crossfilter', 'brush'], 
        default: ['zoom', 'selection'],
        description: 'Interactive features'
      },
      realTimeUpdate: { type: 'boolean', default: false, description: 'Enable real-time data updates' },
      exportOptions: { 
        type: 'multiselect', 
        options: ['png', 'svg', 'pdf', 'data'], 
        default: ['png'],
        description: 'Chart export formats'
      }
    },
    inputs: ['chart_data', 'update_trigger'],
    outputs: ['user_interactions', 'selected_data', 'chart_events'],
    preview: {
      width: 500,
      height: 300,
      showInPalette: true
    }
  },

  'smart-dashboard': {
    id: 'smart-dashboard',
    name: 'Adaptive Dashboard',
    category: 'output',
    icon: 'fas fa-tachometer-alt',
    description: 'Self-organizing dashboard that adapts to data and user behavior',
    tags: ['dashboard', 'adaptive', 'analytics', 'smart'],
    difficulty: 'advanced',
    estimatedSetupTime: '15 minutes',
    properties: {
      layout: { 
        type: 'select', 
        options: ['grid', 'masonry', 'adaptive', 'custom'], 
        default: 'adaptive',
        description: 'Dashboard layout system'
      },
      autoResize: { type: 'boolean', default: true, description: 'Automatically resize widgets' },
      widgets: { 
        type: 'array', 
        itemType: 'object',
        default: [
          { type: 'metric', title: 'Key Metric', size: 'small' },
          { type: 'chart', title: 'Trend Analysis', size: 'large' }
        ],
        description: 'Dashboard widget configuration'
      },
      personalization: { type: 'boolean', default: true, description: 'Enable user personalization' },
      refreshInterval: { type: 'number', default: 30, min: 5, max: 300, unit: 'seconds', description: 'Data refresh interval' }
    },
    inputs: ['dashboard_data', 'user_preferences'],
    outputs: ['widget_interactions', 'layout_changes', 'user_actions'],
    preview: {
      width: 800,
      height: 500,
      showInPalette: false
    }
  }
}

// Component search and filtering utilities
export function searchComponents(query, categories = null) {
  const results = []
  const queryLower = query.toLowerCase()

  Object.values(advancedComponents).forEach(component => {
    if (categories && !categories.includes(component.category)) return

    const searchText = `
      ${component.name} 
      ${component.description} 
      ${component.tags.join(' ')}
      ${component.category}
    `.toLowerCase()

    if (searchText.includes(queryLower)) {
      // Calculate relevance score
      let score = 0
      if (component.name.toLowerCase().includes(queryLower)) score += 10
      if (component.tags.some(tag => tag.includes(queryLower))) score += 5
      if (component.description.toLowerCase().includes(queryLower)) score += 2

      results.push({ ...component, relevanceScore: score })
    }
  })

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

export function getComponentsByCategory(category) {
  return Object.values(advancedComponents).filter(
    component => component.category === category
  )
}

export function getComponentById(id) {
  return advancedComponents[id]
}

export function getPopularComponents(limit = 10) {
  // In a real app, this would use usage analytics
  return Object.values(advancedComponents)
    .sort((a, b) => a.difficulty === 'beginner' ? -1 : 1)
    .slice(0, limit)
}

export function getRecommendedComponents(currentComponents = []) {
  // Simple recommendation based on category balance
  const categoryCount = {}
  currentComponents.forEach(comp => {
    const component = getComponentById(comp.type)
    if (component) {
      categoryCount[component.category] = (categoryCount[component.category] || 0) + 1
    }
  })

  // Recommend components from underrepresented categories
  const underrepresentedCategories = Object.keys(componentCategories)
    .sort((a, b) => (categoryCount[a] || 0) - (categoryCount[b] || 0))
    .slice(0, 3)

  const recommendations = []
  underrepresentedCategories.forEach(category => {
    const categoryComponents = getComponentsByCategory(category)
    recommendations.push(...categoryComponents.slice(0, 2))
  })

  return recommendations.slice(0, 6)
}