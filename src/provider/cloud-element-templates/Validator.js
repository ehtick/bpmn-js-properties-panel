import {
  Validator as BaseValidator,
  filteredSchemaErrors,
  getSchemaVersion
} from '../element-templates/Validator';

import semverCompare from 'semver-compare';

import BpmnModdle from 'bpmn-moddle';

import {
  validateZeebe as validateAgainstSchema,
  getZeebeSchemaPackage as getTemplateSchemaPackage,
  getZeebeSchemaVersion as getTemplateSchemaVersion
} from '@bpmn-io/element-templates-validator';

const SUPPORTED_SCHEMA_VERSION = getTemplateSchemaVersion();
const SUPPORTED_SCHEMA_PACKAGE = getTemplateSchemaPackage();

/**
 * A Camunda Cloud element template validator.
 */
export class Validator extends BaseValidator {
  constructor() {
    super();
  }

  /**
   * Validate given template and return error (if any).
   *
   * @param {TemplateDescriptor} template
   *
   * @return {Error} validation error, if any
   */
  _validateTemplate(template) {
    let err;

    const id = template.id,
          version = template.version || '_',
          schema = template.$schema,
          schemaVersion = schema && getSchemaVersion(schema);

    // (1) $schema attribute defined
    if (!schema) {
      return this._logError(
        'missing $schema attribute.',
        template
      );
    }

    if (!this.isSchemaValid(schema)) {
      return this._logError(
        `unsupported $schema attribute <${ schema }>.`,
        template
      );
    }

    // (2) compatibility
    if (schemaVersion && (semverCompare(SUPPORTED_SCHEMA_VERSION, schemaVersion) < 0)) {
      return this._logError(
        `unsupported element template schema version <${ schemaVersion }>. Your installation only supports up to version <${ SUPPORTED_SCHEMA_VERSION }>. Please update your installation`,
        template
      );
    }

    // (3) versioning
    if (this._templatesById[ id ] && this._templatesById[ id ][ version ]) {
      if (version === '_') {
        return this._logError(`template id <${ id }> already used`, template);
      } else {
        return this._logError(`template id <${ id }> and version <${ version }> already used`, template);
      }
    }

    // (4) elementType validation
    if (template.elementType && template.appliesTo) {

      const elementType = template.elementType.value,
            appliesTo = template.appliesTo;

      // (3.1) template can be applied to elementType
      if (!appliesTo.find(type => isType(elementType, type))) {
        return this._logError(`template does not apply to requested element type <${ elementType }>`, template);
      }

      // (3.2) template only applies to same type of element
      for (const sourceType of appliesTo) {
        if (!canMorph(elementType, sourceType)) {
          return this._logError(`can not morph <${sourceType}> into <${elementType}>`, template);
        }
      }
    }

    // (5) JSON schema compliance
    const validationResult = validateAgainstSchema(template);

    const {
      errors,
      valid
    } = validationResult;

    if (!valid) {
      err = new Error('invalid template');

      filteredSchemaErrors(errors).forEach((error) => {
        this._logError(error.message, template);
      });
    }

    return err;
  }

  isSchemaValid(schema) {
    return schema && schema.includes(SUPPORTED_SCHEMA_PACKAGE);
  }
}

// helpers ///////////////////////

const moddle = new BpmnModdle();
const MORPHABLE_TYPES = [ 'bpmn:Task', 'bpmn:Event', 'bpmn:Gateway' ];

/**
 * Check if given type is a subtype of given base type.
 *
 * @param {String} type
 * @param {String} baseType
 * @returns {Boolean}
 */
function isType(type, baseType) {
  const sourceInstance = moddle.create(type);

  return sourceInstance.$instanceOf(baseType);
}


/**
 * Checks if a given type can be morphed into another type.
 *
 * @param {String} sourceType
 * @param {String} targetType
 * @returns {Boolean}
 */
function canMorph(sourceType, targetType) {

  if (sourceType === targetType) {
    return true;
  }

  const baseType = MORPHABLE_TYPES.find(type => isType(sourceType, type));

  if (!baseType) {
    return false;
  }

  return isType(targetType, baseType);
}