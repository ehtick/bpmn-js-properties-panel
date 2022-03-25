/**
 * DOM parsing utility
 */

const NS = 'http://www.w3.org/2000/svg';

const SVG_START = '<svg xmlns="' + NS + '"';

export function parse(svg) {

  let unwrap = false;

  // ensure we import a valid svg document
  if (svg.substring(0, 4) === '<svg') {
    if (svg.indexOf(NS) === -1) {
      svg = SVG_START + svg.substring(4);
    }
  } else {

    // namespace svg
    svg = SVG_START + '>' + svg + '</svg>';
    unwrap = true;
  }

  const parsed = parseDocument(svg);

  if (!unwrap) {
    return parsed;
  }

  const fragment = document.createDocumentFragment();

  const parent = parsed.firstChild;

  while (parent.firstChild) {
    fragment.appendChild(parent.firstChild);
  }

  return fragment;
}

function parseDocument(svg) {

  let parser;

  // parse
  parser = new DOMParser();
  parser.async = false;

  return parser.parseFromString(svg, 'text/xml');
}

/**
 * Validates a given string whether it is a SVG representation
 * by trying to parse a DOM element out of it.
 *
 * @param {String} str
 * @return {Boolean}
 */
export function isValidSVG(str) {
  const element = parse(str).firstChild;
  const domNode = document.importNode(element, true);
  return domNode && domNode instanceof SVGElement;
}