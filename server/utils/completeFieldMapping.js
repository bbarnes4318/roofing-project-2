/**
 * Complete field mapping for all 37 database tables
 * This provides validation, transformation, and upload support for every single field
 */

// Import the complete schema from the export script
const { DATABASE_SCHEMA } = require('../scripts/export-complete-database-schema');

/**
 * Field transformation functions
 */
const FieldTransformers = {
  // String transformations
  trimString: (value) => value ? value.toString().trim() : null,
  lowerCaseEmail: (value) => value ? value.toString().toLowerCase().trim() : null,
  upperCaseEnum: (value) => value ? value.toString().toUpperCase().trim() : null,
  
  // Number transformations
  parseInt: (value) => value ? parseInt(value) : null,
  parseFloat: (value) => value ? parseFloat(value) : null,
  parseDecimal: (value) => value ? parseFloat(value) : null,
  
  // Boolean transformations
  parseBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const str = value.toLowerCase().trim();
      return str === 'true' || str === '1' || str === 'yes' || str === 'on';
    }
    return Boolean(value);
  },
  
  // Date transformations
  parseDateTime: (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },
  
  // Array transformations
  parseStringArray: (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.toString().split(',').map(s => s.trim()).filter(s => s);
  },
  
  parseEnumArray: (value, enumValues) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.toString().split(',').map(s => s.trim().toUpperCase()).filter(s => enumValues.includes(s));
  },
  
  // JSON transformations
  parseJson: (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
};

/**
 * Field validators
 */
const FieldValidators = {
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value, fieldName) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return null;
  },
  
  phone: (value, fieldName) => {
    if (value && !/^\+?[\d\s\-\(\)]{10,}$/.test(value)) {
      return `${fieldName} must be a valid phone number`;
    }
    return null;
  },
  
  url: (value, fieldName) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return `${fieldName} must be a valid URL`;
      }
    }
    return null;
  },
  
  enum: (value, fieldName, enumValues) => {
    if (value && !enumValues.includes(value)) {
      return `${fieldName} must be one of: ${enumValues.join(', ')}`;
    }
    return null;
  },
  
  range: (value, fieldName, min, max) => {
    if (value !== null && value !== undefined) {
      const num = Number(value);
      if (num < min || num > max) {
        return `${fieldName} must be between ${min} and ${max}`;
      }
    }
    return null;
  },
  
  maxLength: (value, fieldName, maxLength) => {
    if (value && value.toString().length > maxLength) {
      return `${fieldName} cannot exceed ${maxLength} characters`;
    }
    return null;
  }
};

/**
 * Complete field mapping configuration for all tables
 */
const COMPLETE_FIELD_MAPPING = {};

// Generate field mapping for each table from the schema
Object.entries(DATABASE_SCHEMA).forEach(([tableName, tableInfo]) => {
  COMPLETE_FIELD_MAPPING[tableName] = {
    tableName,
    fields: {},
    relationships: [],
    uploadable: true,
    displayName: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };

  // Process each field
  tableInfo.fields.forEach(field => {
    const fieldConfig = {
      name: field.name,
      type: field.type,
      constraint: field.constraint,
      enumValues: field.enumValues || null,
      required: field.constraint.includes('Required') || field.constraint.includes('Primary Key'),
      unique: field.constraint.includes('Unique'),
      autoManaged: field.constraint.includes('Auto-managed'),
      primaryKey: field.constraint.includes('Primary Key'),
      foreignKey: field.constraint.includes('Foreign key'),
      
      // Determine transformer based on type
      transformer: null,
      validators: []
    };

    // Set transformer based on field type
    if (field.type.includes('String') && field.name.includes('email')) {
      fieldConfig.transformer = FieldTransformers.lowerCaseEmail;
      fieldConfig.validators.push((value) => FieldValidators.email(value, field.name));
    } else if (field.type.includes('String') && field.name.includes('phone')) {
      fieldConfig.transformer = FieldTransformers.trimString;
      fieldConfig.validators.push((value) => FieldValidators.phone(value, field.name));
    } else if (field.type.includes('String') && field.enumValues) {
      fieldConfig.transformer = FieldTransformers.upperCaseEnum;
      fieldConfig.validators.push((value) => FieldValidators.enum(value, field.name, field.enumValues));
    } else if (field.type.includes('String')) {
      fieldConfig.transformer = FieldTransformers.trimString;
      // Extract max length from constraint
      const match = field.constraint.match(/VarChar\((\d+)\)/);
      if (match) {
        const maxLength = parseInt(match[1]);
        fieldConfig.validators.push((value) => FieldValidators.maxLength(value, field.name, maxLength));
      }
    } else if (field.type === 'Int') {
      fieldConfig.transformer = FieldTransformers.parseInt;
      if (field.name === 'progress') {
        fieldConfig.validators.push((value) => FieldValidators.range(value, field.name, 0, 100));
      }
    } else if (field.type === 'Decimal') {
      fieldConfig.transformer = FieldTransformers.parseDecimal;
    } else if (field.type === 'Boolean') {
      fieldConfig.transformer = FieldTransformers.parseBoolean;
    } else if (field.type.includes('DateTime')) {
      fieldConfig.transformer = FieldTransformers.parseDateTime;
    } else if (field.type.includes('[]') && field.enumValues) {
      fieldConfig.transformer = (value) => FieldTransformers.parseEnumArray(value, field.enumValues);
    } else if (field.type.includes('[]')) {
      fieldConfig.transformer = FieldTransformers.parseStringArray;
    } else if (field.type.includes('Json')) {
      fieldConfig.transformer = FieldTransformers.parseJson;
    }

    // Add required validator
    if (fieldConfig.required && !fieldConfig.autoManaged && !fieldConfig.primaryKey) {
      fieldConfig.validators.unshift((value) => FieldValidators.required(value, field.name));
    }

    // Track relationships
    if (fieldConfig.foreignKey) {
      COMPLETE_FIELD_MAPPING[tableName].relationships.push({
        field: field.name,
        referencedTable: field.constraint.match(/Foreign key to (\w+)/)?.[1] || 'unknown',
        required: fieldConfig.required
      });
    }

    // Determine if field is uploadable
    fieldConfig.uploadable = !fieldConfig.autoManaged && !fieldConfig.primaryKey;

    COMPLETE_FIELD_MAPPING[tableName].fields[field.name] = fieldConfig;
  });
});

/**
 * Data transformation and validation functions
 */
const DataProcessor = {
  /**
   * Transform raw data according to field mapping
   */
  transformData: (tableName, rowData) => {
    const mapping = COMPLETE_FIELD_MAPPING[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    const transformed = {};
    const errors = [];

    Object.entries(mapping.fields).forEach(([fieldName, fieldConfig]) => {
      const rawValue = rowData[fieldName];

      try {
        // Apply transformer if present
        let transformedValue = rawValue;
        if (fieldConfig.transformer) {
          transformedValue = fieldConfig.transformer(rawValue);
        }

        // Apply validators
        fieldConfig.validators.forEach(validator => {
          const error = validator(transformedValue);
          if (error) {
            errors.push(error);
          }
        });

        // Set transformed value
        if (transformedValue !== undefined) {
          transformed[fieldName] = transformedValue;
        }
      } catch (error) {
        errors.push(`Error processing ${fieldName}: ${error.message}`);
      }
    });

    return { transformed, errors };
  },

  /**
   * Validate data for a specific table
   */
  validateData: (tableName, data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      const { errors: rowErrors } = this.transformData(tableName, row);
      rowErrors.forEach(error => {
        errors.push(`Row ${index + 1}: ${error}`);
      });
    });

    return errors;
  },

  /**
   * Get uploadable fields for a table
   */
  getUploadableFields: (tableName) => {
    const mapping = COMPLETE_FIELD_MAPPING[tableName];
    if (!mapping) return [];

    return Object.entries(mapping.fields)
      .filter(([_, fieldConfig]) => fieldConfig.uploadable)
      .map(([fieldName, fieldConfig]) => ({
        name: fieldName,
        type: fieldConfig.type,
        required: fieldConfig.required,
        enumValues: fieldConfig.enumValues,
        constraint: fieldConfig.constraint
      }));
  },

  /**
   * Generate sample data for a table
   */
  generateSampleData: (tableName) => {
    const uploadableFields = this.getUploadableFields(tableName);
    const sampleData = {};

    uploadableFields.forEach(field => {
      if (field.enumValues && field.enumValues.length > 0) {
        sampleData[field.name] = field.enumValues[0];
      } else if (field.type === 'Boolean') {
        sampleData[field.name] = true;
      } else if (field.type === 'Int') {
        sampleData[field.name] = field.name === 'progress' ? 0 : 1;
      } else if (field.type === 'Decimal') {
        sampleData[field.name] = 100.00;
      } else if (field.type.includes('DateTime')) {
        sampleData[field.name] = '2025-01-01T00:00:00Z';
      } else if (field.type.includes('[]')) {
        sampleData[field.name] = 'item1,item2';
      } else if (field.type.includes('Json')) {
        sampleData[field.name] = '{"key": "value"}';
      } else {
        sampleData[field.name] = `Sample ${field.name}`;
      }
    });

    return sampleData;
  }
};

/**
 * Export functions for use in other modules
 */
module.exports = {
  COMPLETE_FIELD_MAPPING,
  FieldTransformers,
  FieldValidators,
  DataProcessor,
  
  // Utility functions
  getAllTables: () => Object.keys(COMPLETE_FIELD_MAPPING),
  getTableInfo: (tableName) => COMPLETE_FIELD_MAPPING[tableName],
  getUploadableTables: () => Object.keys(COMPLETE_FIELD_MAPPING).filter(table => 
    COMPLETE_FIELD_MAPPING[table].uploadable
  ),
  
  // Helper functions
  isTableValid: (tableName) => tableName in COMPLETE_FIELD_MAPPING,
  getFieldConfig: (tableName, fieldName) => COMPLETE_FIELD_MAPPING[tableName]?.fields[fieldName],
  getTableFields: (tableName) => Object.keys(COMPLETE_FIELD_MAPPING[tableName]?.fields || {}),
  getRequiredFields: (tableName) => Object.entries(COMPLETE_FIELD_MAPPING[tableName]?.fields || {})
    .filter(([_, config]) => config.required && config.uploadable)
    .map(([name, _]) => name)
};