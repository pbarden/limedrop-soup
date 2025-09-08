import { useState, useEffect } from 'react'
import styles from '../../styles/FileManager.module.css'

function FileManager() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedType, setSelectedType] = useState('default')
  const [files, setFiles] = useState([])
  const [fileTypes, setFileTypes] = useState(['default', 'document', 'image', 'video'])

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = () => {
    const savedFiles = JSON.parse(localStorage.getItem('limedrop-files') || '[]')
    setFiles(savedFiles)
  }

  const saveFiles = (newFiles) => {
    localStorage.setItem('limedrop-files', JSON.stringify(newFiles))
    setFiles(newFiles)
  }

  const createNewFile = () => {
    const fileName = prompt('Enter file name:')
    if (!fileName) return

    const newFile = {
      id: Date.now().toString(),
      name: fileName,
      type: selectedType,
      content: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }

    const updatedFiles = [...files, newFile]
    saveFiles(updatedFiles)
  }

  const createNewType = () => {
    const typeName = prompt('Enter new file type name:')
    if (!typeName || fileTypes.includes(typeName)) return

    setFileTypes(prev => [...prev, typeName])
  }

  const renameFile = (fileId) => {
    const file = files.find(f => f.id === fileId)
    const newName = prompt('Enter new name:', file.name)
    if (!newName || newName === file.name) return

    const updatedFiles = files.map(f =>
      f.id === fileId
        ? { ...f, name: newName, modified: new Date().toISOString() }
        : f
    )
    saveFiles(updatedFiles)
    
    if (selectedFile?.id === fileId) {
      setSelectedFile({ ...selectedFile, name: newName })
    }
  }

  const duplicateFile = (fileId) => {
    const file = files.find(f => f.id === fileId)
    const newFile = {
      ...file,
      id: Date.now().toString(),
      name: file.name + ' (Copy)',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }

    const updatedFiles = [...files, newFile]
    saveFiles(updatedFiles)
  }

  const copyFile = (fileId) => {
    const file = files.find(f => f.id === fileId)
    navigator.clipboard.writeText(file.content)
  }

  const importFiles = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.txt,.json,.csv,.md'
    
    input.onchange = (e) => {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const newFile = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            type: selectedType,
            content: event.target.result,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          }
          
          const updatedFiles = [...files, newFile]
          saveFiles(updatedFiles)
        }
        reader.readAsText(file)
      })
    }
    
    input.click()
  }

  const exportFiles = () => {
    const filesToExport = filterFilesByType(selectedType)
    const exportData = {
      type: selectedType,
      files: filesToExport,
      exported: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedType}-files-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteFile = (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    const updatedFiles = files.filter(f => f.id !== fileId)
    saveFiles(updatedFiles)
    
    if (selectedFile?.id === fileId) {
      setSelectedFile(null)
    }
  }

  const updateFileContent = (fileId, content) => {
    const updatedFiles = files.map(f => 
      f.id === fileId 
        ? { ...f, content, modified: new Date().toISOString() }
        : f
    )
    saveFiles(updatedFiles)
    
    if (selectedFile?.id === fileId) {
      setSelectedFile({ ...selectedFile, content })
    }
  }

  const filterFilesByType = (type) => {
    return files.filter(f => f.type === type)
  }

  return (
    <div className={styles.fileManager}>
      <div className={styles.fileManagerHeader}>
        <h2>File Manager</h2>
        <div className={styles.fileManagerControls}>
          <button className="btn-secondary" onClick={createNewFile}>New File</button>
          <button className="btn-secondary" onClick={createNewType}>New Type</button>
          <button className="btn-secondary" onClick={importFiles}>Import</button>
          <button className="btn-primary" onClick={exportFiles}>Export</button>
        </div>
      </div>
      
      <div className={styles.fileManagerBody}>
        <div className={styles.fileTypesPanel}>
          <h3>File Types</h3>
          <div className={styles.fileTypesList}>
            {fileTypes.map(type => (
              <div 
                key={type}
                className={`${styles.fileType} ${selectedType === type ? styles.selected : ''}`}
                onClick={() => setSelectedType(type)}
              >
                <i className="fas fa-folder"></i>
                <span>{type} ({filterFilesByType(type).length})</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.filesPanel}>
          <h3>Files</h3>
          <div className={styles.filesList}>
            {filterFilesByType(selectedType).map(file => (
              <div 
                key={file.id}
                className={`${styles.fileItem} ${selectedFile?.id === file.id ? styles.selected : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileInfo}>
                  <span>{new Date(file.modified).toLocaleDateString()}</span>
                  <div className={styles.fileActions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        renameFile(file.id)
                      }}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicateFile(file.id)
                      }}
                      title="Duplicate"
                    >
                      ⧉
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        copyFile(file.id)
                      }}
                      title="Copy Content"
                    >
                      📋
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(file.id)
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.fileEditor}>
          {selectedFile ? (
            <>
              <div className={styles.editorHeader}>
                <h3>Editing: {selectedFile.name}</h3>
                <div className={styles.editorActions}>
                  <button 
                    className="btn-secondary btn-small"
                    onClick={() => copyFile(selectedFile.id)}
                  >
                    Copy Content
                  </button>
                  <button 
                    className="btn-secondary btn-small"
                    onClick={() => renameFile(selectedFile.id)}
                  >
                    Rename
                  </button>
                </div>
              </div>
              <textarea
                className={styles.fileContent}
                value={selectedFile.content}
                onChange={(e) => updateFileContent(selectedFile.id, e.target.value)}
                placeholder="Enter file content..."
              />
              <div className={styles.fileStats}>
                <span>Characters: {selectedFile.content.length}</span>
                <span>Lines: {selectedFile.content.split('\n').length}</span>
                <span>Modified: {new Date(selectedFile.modified).toLocaleString()}</span>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <i className="fas fa-file-alt"></i>
              <p>Select a file to edit</p>
              <small>Choose from the files list to start editing</small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileManager