import React, { useState, useCallback, useEffect } from 'react'
import { getComponentById } from '../data/componentLibrary'
import styles from '../styles/SmartPropertyEditor.module.css'

function SmartPropertyEditor({ 
  selectedComponent, 
  onPropertyChange, 
  onValidationChange,
  isLivePreview = true 
}) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [validationState, setValidationState] = useState('valid')

  const componentMeta = selectedComponent ? getComponentById(selectedComponent.type) : null

  // Initialize values from component
  useEffect(() => {
    if (componentMeta && selectedComponent) {
      const initialValues = {}
      Object.entries(componentMeta.properties || {}).forEach(([key, prop]) => {
        initialValues[key] = selectedComponent.config?.[key] ?? prop.default
      })
      setValues(initialValues)
      setIsDirty(false)
    }
  }, [selectedComponent, componentMeta])

  // Validate property value
  const validateProperty = useCallback((key, value, propertyConfig) => {
    const errors = []

    // Type validation
    if (propertyConfig.type === 'number') {
      const num = parseFloat(value)
      if (isNaN(num)) {
        errors.push('Must be a valid number')
      } else {
        if (propertyConfig.min !== undefined && num < propertyConfig.min) {
          errors.push(`Must be at least ${propertyConfig.min}`)
        }
        if (propertyConfig.max !== undefined && num > propertyConfig.max) {
          errors.push(`Must be at most ${propertyConfig.max}`)
        }
      }
    }

    // Required validation
    if (propertyConfig.required && (!value || value.toString().trim() === '')) {
      errors.push('This field is required')
    }

    // Custom validation
    if (propertyConfig.validate) {
      const customError = propertyConfig.validate(value)
      if (customError) errors.push(customError)
    }

    return errors
  }, [])

  // Handle property change with validation
  const handlePropertyChange = useCallback((key, newValue) => {
    const propertyConfig = componentMeta?.properties?.[key]
    if (!propertyConfig) return

    // Update values
    const newValues = { ...values, [key]: newValue }
    setValues(newValues)
    setIsDirty(true)

    // Validate
    const propertyErrors = validateProperty(key, newValue, propertyConfig)
    const newErrors = { ...errors }
    
    if (propertyErrors.length > 0) {
      newErrors[key] = propertyErrors
    } else {
      delete newErrors[key]
    }
    
    setErrors(newErrors)

    // Update validation state
    const hasErrors = Object.keys(newErrors).length > 0
    const newValidationState = hasErrors ? 'invalid' : 'valid'
    setValidationState(newValidationState)

    // Notify parent components
    onValidationChange?.(newValidationState, newErrors)
    
    if (isLivePreview || newValidationState === 'valid') {
      onPropertyChange?.(key, newValue, newValues)
    }
  }, [values, errors, componentMeta, validateProperty, onPropertyChange, onValidationChange, isLivePreview])

  // Apply all changes
  const handleApplyChanges = useCallback(() => {
    if (validationState === 'valid') {
      Object.entries(values).forEach(([key, value]) => {
        onPropertyChange?.(key, value, values)
      })
      setIsDirty(false)
    }
  }, [values, validationState, onPropertyChange])

  // Reset to original values
  const handleReset = useCallback(() => {
    if (componentMeta && selectedComponent) {
      const resetValues = {}
      Object.entries(componentMeta.properties || {}).forEach(([key, prop]) => {
        resetValues[key] = selectedComponent.config?.[key] ?? prop.default
      })
      setValues(resetValues)
      setErrors({})
      setIsDirty(false)
      setValidationState('valid')
    }
  }, [componentMeta, selectedComponent])

  // Render different property input types
  const renderPropertyInput = (key, propertyConfig, value) => {
    const hasError = errors[key]
    const inputClassName = `${styles.propertyInput} ${hasError ? styles.error : ''}`

    switch (propertyConfig.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className={inputClassName}
            placeholder={propertyConfig.placeholder || `Enter ${key}...`}
          />
        )

      case 'number':
        return (
          <div className={styles.numberInput}>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value) || 0)}
              className={inputClassName}
              min={propertyConfig.min}
              max={propertyConfig.max}
              step={propertyConfig.step || 1}
            />
            {propertyConfig.unit && (
              <span className={styles.unit}>{propertyConfig.unit}</span>
            )}
          </div>
        )

      case 'boolean':
        return (
          <label className={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handlePropertyChange(key, e.target.checked)}
            />
            <span className={styles.toggleSlider}></span>
          </label>
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className={inputClassName}
          >
            {propertyConfig.options.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <div className={styles.multiselectContainer}>
            {propertyConfig.options.map(option => (
              <label key={option} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValue = value || []
                    const newValue = e.target.checked
                      ? [...currentValue, option]
                      : currentValue.filter(v => v !== option)
                    handlePropertyChange(key, newValue)
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'slider':
        return (
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min={propertyConfig.min || 0}
              max={propertyConfig.max || 100}
              step={propertyConfig.step || 1}
              value={value || propertyConfig.default || 0}
              onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderValue}>
              {(value || propertyConfig.default || 0).toFixed(propertyConfig.decimals || 0)}
            </span>
          </div>
        )

      case 'color':
        return (
          <div className={styles.colorInputContainer}>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className={styles.colorText}
              placeholder="#000000"
            />
          </div>
        )

      case 'code':
        return (
          <div className={styles.codeEditor}>
            <div className={styles.codeHeader}>
              <span className={styles.codeLanguage}>{propertyConfig.language || 'javascript'}</span>
              <button 
                type="button"
                className={styles.formatButton}
                onClick={() => {
                  // Format code (simplified)
                  try {
                    if (propertyConfig.language === 'json') {
                      const formatted = JSON.stringify(JSON.parse(value), null, 2)
                      handlePropertyChange(key, formatted)
                    }
                  } catch (e) {
                    // Ignore formatting errors
                  }
                }}
              >
                <i className="fas fa-magic"></i>
                Format
              </button>
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className={`${styles.codeTextarea} ${hasError ? styles.error : ''}`}
              rows={propertyConfig.rows || 6}
              placeholder={propertyConfig.placeholder}
              spellCheck={false}
            />
          </div>
        )

      case 'array':
        return (
          <div className={styles.arrayEditor}>
            <div className={styles.arrayHeader}>
              <span>{key} ({(value || []).length} items)</span>
              <button 
                type="button"
                className={styles.addButton}
                onClick={() => {
                  const newItem = propertyConfig.itemType === 'object' ? {} : ''
                  handlePropertyChange(key, [...(value || []), newItem])
                }}
              >
                <i className="fas fa-plus"></i>
                Add Item
              </button>
            </div>
            <div className={styles.arrayItems}>
              {(value || []).map((item, index) => (
                <div key={index} className={styles.arrayItem}>
                  <span className={styles.itemIndex}>{index + 1}</span>
                  {propertyConfig.itemType === 'object' ? (
                    <div className={styles.objectEditor}>
                      <textarea
                        value={JSON.stringify(item, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            const newArray = [...(value || [])]
                            newArray[index] = parsed
                            handlePropertyChange(key, newArray)
                          } catch (e) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={3}
                        className={styles.jsonTextarea}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newArray = [...(value || [])]
                        newArray[index] = e.target.value
                        handlePropertyChange(key, newArray)
                      }}
                      className={styles.arrayItemInput}
                    />
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => {
                      const newArray = (value || []).filter((_, i) => i !== index)
                      handlePropertyChange(key, newArray)
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className={inputClassName}
          />
        )
    }
  }

  if (!componentMeta || !selectedComponent) {
    return (
      <div className={styles.noSelection}>
        <div className={styles.noSelectionContent}>
          <i className="fas fa-mouse-pointer"></i>
          <h3>No Component Selected</h3>
          <p>Select a component from the workflow to edit its properties</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.propertyEditor}>
      {/* Header */}
      <div className={styles.propertyHeader}>
        <div className={styles.componentInfo}>
          <div className={styles.componentIcon}>
            <i className={componentMeta.icon}></i>
          </div>
          <div className={styles.componentDetails}>
            <h3>{componentMeta.name}</h3>
            <p>{componentMeta.description}</p>
          </div>
        </div>
        
        <div className={styles.validationStatus}>
          <div className={`${styles.statusIndicator} ${styles[validationState]}`}>
            <i className={validationState === 'valid' ? 'fas fa-check' : 'fas fa-exclamation-triangle'}></i>
            <span>{validationState === 'valid' ? 'Valid' : 'Has Errors'}</span>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className={styles.propertiesContainer}>
        {Object.entries(componentMeta.properties || {}).map(([key, propertyConfig]) => (
          <div key={key} className={styles.propertyGroup}>
            <label className={styles.propertyLabel}>
              <span className={styles.labelText}>
                {propertyConfig.name || key.charAt(0).toUpperCase() + key.slice(1)}
                {propertyConfig.required && <span className={styles.required}>*</span>}
              </span>
              {propertyConfig.description && (
                <div className={styles.propertyDescription}>
                  {propertyConfig.description}
                </div>
              )}
            </label>
            
            {renderPropertyInput(key, propertyConfig, values[key])}
            
            {errors[key] && (
              <div className={styles.propertyErrors}>
                {errors[key].map((error, index) => (
                  <div key={index} className={styles.propertyError}>
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {isDirty && (
        <div className={styles.propertyActions}>
          <button 
            type="button"
            className={`${styles.actionButton} ${styles.resetButton}`}
            onClick={handleReset}
          >
            <i className="fas fa-undo"></i>
            Reset
          </button>
          
          <button 
            type="button"
            className={`${styles.actionButton} ${styles.applyButton}`}
            onClick={handleApplyChanges}
            disabled={validationState !== 'valid'}
          >
            <i className="fas fa-check"></i>
            Apply Changes
          </button>
        </div>
      )}
    </div>
  )
}

export default SmartPropertyEditor