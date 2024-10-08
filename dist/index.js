"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _htmlElementAttributes = _interopRequireDefault(require("html-element-attributes"));
var _isWhitespaceCharacter = _interopRequireDefault(require("is-whitespace-character"));
var _mdAttrParser = _interopRequireDefault(require("md-attr-parser"));
var _domEventHandler = _interopRequireDefault(require("./dom-event-handler.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var supportedElements = new Set(["link", "atxHeading", "strong", "emphasis", "deletion", "code", "setextHeading", "fencedCode", "reference", "footnoteCall", "autoLink"]);
var blockElements = new Set(["atxHeading", "setextHeading"]);
var particularElements = new Set(["fencedCode"]);
var particularTokenize = {};
/* Table convertion between type and HTML tagName */
var convTypeTag = {
  image: "img",
  link: "a",
  heading: "h1",
  strong: "strong",
  emphasis: "em",
  "delete": "s",
  inlineCode: "code",
  code: "code",
  linkReference: "a",
  "*": "*"
};

/* This function is a generic function that transform
 * the tokenize function a node type to a version that understand
 * attributes.
 *
 * The tokenizer function of strong will tokenize **STRONG STRING**
 * this function extand it to tokenize **STRONG STRING**{list=of attributes}
 *
 * - The prefix is '\n' for block node and '' for inline one
 *
 * The syntax is for atxHeading ::
 * ## HEAD TITLE
 * {attributes}
 *
 * Attributes are on the next line.
 *
 * - The old parser is the old function user to tokenize
 * - The config is the configuration of this plugin
 *
 */
function tokenizeGenerator(prefix, oldParser, config) {
  function token(eat, value, silent) {
    // This we call the old tokenize
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var index = 0;
    var parsedAttr;
    var length = value.length;
    if (!eaten || !eaten.position) {
      return undefined;
    }
    var type = convTypeTag[eaten.type];
    index = eaten.position.end.offset - eaten.position.start.offset;

    // Then we check for attributes
    if (index + prefix.length < length && value.charAt(index + prefix.length) === "{") {
      // If any, parse it
      parsedAttr = (0, _mdAttrParser["default"])(value, index + prefix.length, config.mdAttrConfig);
    }

    // If parsed configure the node
    if (parsedAttr) {
      if (config.scope && config.scope !== "none") {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);
        if (eaten.data) {
          eaten.data.hProperties = filtredProp;
        } else {
          eaten.data = {
            hProperties: filtredProp
          };
        }
      }
      eaten = eat(prefix + parsedAttr.eaten)(eaten);
    }
    return eaten;
  }

  // Return the new tokenizer function
  return token;
}
function tokenizeModifierGenerator(oldParser, config) {
  function token(eat, value, silent) {
    // This we call the old tokenize
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var index = 0;
    if (!eaten || !eaten.position || !eaten.children || eaten.children.length <= 0) {
      return eaten;
    }
    var type = convTypeTag[eaten.type];
    var lastChild = eaten.children[eaten.children.length - 1];
    if (!lastChild.value || lastChild.value.length <= 0 || lastChild.value[lastChild.value.length - 1] !== "}") {
      return eaten;
    }
    index = lastChild.value.lastIndexOf("{");
    if (index <= 0) {
      return eaten;
    }
    var parsedAttr = (0, _mdAttrParser["default"])(lastChild.value, index, config.mdAttrConfig);
    if (parsedAttr.eaten.length !== lastChild.value.length - index) {
      return eaten;
    }
    index -= 1;
    while (index >= 0 && (0, _isWhitespaceCharacter["default"])(lastChild.value[index])) {
      index -= 1;
    }
    if (index < 0) {
      return eaten;
    }

    // If parsed configure the node
    if (parsedAttr) {
      if (config.scope && config.scope !== "none") {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);
        if (eaten.data) {
          eaten.data.hProperties = filtredProp;
        } else {
          eaten.data = {
            hProperties: filtredProp
          };
        }
      }
      lastChild.value = lastChild.value.slice(0, index + 1);
    }
    return eaten;
  }

  // Return the new tokenizer function
  return token;
}

// A generic function to parse attributes
function filterAttributes(prop, config, type) {
  var scope = config.scope;
  var extend = config.extend;
  var allowDangerousDOMEventHandlers = config.allowDangerousDOMEventHandlers;
  var specific = _htmlElementAttributes["default"];
  var extendTag = function (extend) {
    var t = {};
    Object.getOwnPropertyNames(extend).forEach(function (p) {
      t[convTypeTag[p]] = extend[p];
    });
    return t;
  }(extend);

  // Delete empty key/class/id attributes
  Object.getOwnPropertyNames(prop).forEach(function (p) {
    if (p !== "key" && p !== "class" && p !== "id") {
      prop[p] = prop[p] || "";
    }
  });
  var isDangerous = function isDangerous(p) {
    return _domEventHandler["default"].includes(p);
  };
  var isSpecific = function isSpecific(p) {
    return type in specific && specific[type].includes(p);
  };
  var isGlobal = function isGlobal(p) {
    return _htmlElementAttributes["default"]["*"].includes(p) || p.match(/^aria-[a-z][a-z.-_\d]*$/) || p.match(/^data-[a-z][a-z_.-0-9]*$/);
  };
  var inScope = function inScope() {
    return false;
  };

  // Function used to `or combine` two other function.
  var orFunc = function orFunc(fun, fun2) {
    return function (x) {
      return fun(x) || fun2(x);
    };
  };

  // Respect the scope configuration
  switch (scope) {
    case "none":
      // Plugin is disabled
      break;
    case "permissive":
    case "every":
      if (allowDangerousDOMEventHandlers) {
        inScope = function inScope() {
          return true;
        };
      } else {
        inScope = function inScope(x) {
          return !isDangerous(x);
        };
      }
      break;
    case "extended":
    default:
      inScope = function inScope(p) {
        return extendTag && type in extendTag && extendTag[type].includes(p);
      };
      inScope = orFunc(inScope, function (p) {
        return "*" in extendTag && extendTag["*"].includes(p);
      });
    // Or if it in the specific scope, fallthrough
    case "specific":
      inScope = orFunc(inScope, isSpecific);
    // Or if it in the global scope fallthrough
    case "global":
      inScope = orFunc(inScope, isGlobal);
      if (allowDangerousDOMEventHandlers) {
        // If allowed add dangerous attributes to global scope
        inScope = orFunc(inScope, isDangerous);
      }
  }

  // If an attributes isn't in the scope, delete it
  Object.getOwnPropertyNames(prop).forEach(function (p) {
    if (!inScope(p)) {
      delete prop[p];
    }
  });
  return prop;
}

/* This is a special modification of the function tokenizeGenerator
 * to parse the fencedCode info string and the fallback
 * customAttr parser
 *
 * It's only temporary
 */
function tokenizeFencedCode(oldParser, config) {
  var prefix = "\n";
  function token(eat, value, silent) {
    // This we call the old tokenize
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var parsedAttr;
    var parsedByCustomAttr = false;
    if (!eaten || !eaten.position) {
      return undefined;
    }
    var type = convTypeTag[eaten.type];

    // First, parse the info string
    // which is the 'lang' attributes of 'eaten'.

    if (eaten.lang) {
      // Then the meta
      if (eaten.meta) {
        parsedAttr = (0, _mdAttrParser["default"])(eaten.meta);
      } else {
        // If it's an old version, we can still find from the attributes
        // from 'value' ¯\_(ツ)_/¯
        // Bad hack, will be deleted soon
        parsedAttr = (0, _mdAttrParser["default"])(value, value.indexOf(" "));
      }
    }

    // If parsed configure the node
    if (parsedAttr) {
      if (config.scope && config.scope !== "none") {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);
        if (eaten.data) {
          eaten.data.hProperties = _objectSpread(_objectSpread({}, eaten.data.hProperties), filtredProp);
        } else {
          eaten.data = {
            hProperties: filtredProp
          };
        }
      }
      if (parsedByCustomAttr) {
        eaten = eat(prefix + parsedAttr.eaten)(eaten);
      }
    }
    return eaten;
  }

  // Return the new tokenizer function

  return token;
}
particularTokenize.fencedCode = tokenizeFencedCode;
remarkAttr.SUPPORTED_ELEMENTS = supportedElements;
var _default = exports["default"] = remarkAttr;
/* Function that is exported */
function remarkAttr(userConfig) {
  var parser = this.Parser;
  var defaultConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: supportedElements,
    extend: {},
    scope: "extended",
    mdAttrConfig: undefined,
    enableAtxHeaderInline: true,
    disableBlockElements: false
  };
  var config = _objectSpread(_objectSpread({}, defaultConfig), userConfig);
  if (!isRemarkParser(parser)) {
    throw new Error("Missing parser to attach `remark-attr` [link] (to)");
  }
  var tokenizers = parser.prototype.inlineTokenizers;
  var tokenizersBlock = parser.prototype.blockTokenizers;

  // For each elements, replace the old tokenizer by the new one
  config.elements.forEach(function (element) {
    if ((element in tokenizersBlock || element in tokenizers) && supportedElements.has(element)) {
      if (!config.disableBlockElements && blockElements.has(element)) {
        var oldElement = tokenizersBlock[element];
        tokenizersBlock[element] = tokenizeGenerator("\n", oldElement, config);
      } else if (particularElements.has(element)) {
        var _oldElement = tokenizersBlock[element];
        tokenizersBlock[element] = particularTokenize[element](_oldElement, config);
      } else {
        var _oldElement2 = tokenizers[element];
        var elementTokenize = tokenizeGenerator("", _oldElement2, config);
        elementTokenize.locator = tokenizers[element].locator;
        tokenizers[element] = elementTokenize;
      }
      if (config.enableAtxHeaderInline && element === "atxHeading") {
        var _oldElement3 = tokenizersBlock[element];
        tokenizersBlock[element] = tokenizeModifierGenerator(_oldElement3, config);
      }
    }
  });
}
function isRemarkParser(parser) {
  return Boolean(parser && parser.prototype && parser.prototype.inlineTokenizers && parser.prototype.inlineTokenizers.link && parser.prototype.inlineTokenizers.link.locator);
}