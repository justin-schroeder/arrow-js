export type DataSourceKey = string | number | symbol | null;

export interface DataSource {
  [index: string]: any;
  [index: number]: any;
}

export interface ArrowTemplate {
  (parent?: ParentNode): ParentNode;
  isT: boolean;
  key: (key: ArrowTemplateKey) => void;
  _h: () => [
    html: string,
    expressions: ReactiveExpressions,
    key: ArrowTemplateKey
  ];
  _k?: ArrowTemplateKey;
}

type ArrowTemplateKey = string | number | undefined;

export type ArrowFragment = {
  <T extends ParentNode>(parent: T): T;
  (): DocumentFragment;
};

export interface ReactiveFunction {
  (el?: Node): string | ArrowTemplate;
  (ev: Event, listener: EventListenerOrEventListenerObject): void;
  $on: (observer: CallableFunction) => void;
  _up: (newExpression: CallableFunction) => void;
  e: CallableFunction;
}

export interface ObserverCallback {
  (value?: any, oldValue?: any): void;
}
export interface DependencyProps {
  $on: (p: DataSourceKey, c: ObserverCallback) => void;
  $off: (p: DataSourceKey, c: ObserverCallback) => void;
  _em: (p: DataSourceKey, newValue: any, oldValue?: any) => void;
  _st: () => ReactiveProxyState;
  _p?: ReactiveProxyParent;
}

export type ReactiveProxy = DataSource & DependencyProps;

type ReactiveProxyParent = [property: DataSourceKey, parent: ReactiveProxy];

export type ReactiveExpressions = Array<ReactiveFunction>;

type ReactiveProxyObservers = Map<DataSourceKey, Set<ObserverCallback>>;

type ReactiveProxyPropertyObservers = Map<ObserverCallback, Set<DataSourceKey>>;

type ReactiveProxyDependencyCollector = Map<
  symbol,
  Map<ReactiveProxy, Set<DataSourceKey>>
>;

export type ParentNode = Element | DocumentFragment;

interface ReactiveProxyState {
  // o = observers
  o?: ReactiveProxyObservers;
  // op = observerProperties
  op?: ReactiveProxyPropertyObservers;
  // r = old Data
  r?: DataSource;
  // p = Parent proxy object.
  p?: ReactiveProxyParent;
}

export type RenderGroup = ArrowTemplate | ArrowTemplate[] | Node | Node[] | string[];

export interface TemplatePartial {
  (): DocumentFragment;
  add: (tpl: ArrowTemplate | number | string) => void;
  _up: () => void;
  l: number;
  ch: () => PartialChunk[];
}

type PartialChunk = {
  html: string;
  exp: ReactiveFunction[];
  dom: ChildNode[];
  tpl: ArrowTemplate | string;
  key: ArrowTemplateKey;
};

/**
 * The delimiter that describes where expressions are located.
 */
const delimiter = '➳❍';
const delimiterCapture = /(➳❍)/;
const delimiterComment = `<!--${delimiter}-->`;

/**
 * A "global" dependency tracker object.
 */
const dependencyCollector: ReactiveProxyDependencyCollector = new Map();

/**
 * A queue of expressions to run as soon as an async slot opens up.
 */
const queueStack: Set<CallableFunction> = new Set();
const nextTicks: Set<CallableFunction> = new Set();
let consumingQueue = false;

/**
 * Queue an item to execute after all synchronous functions have been run. This
 * is used for `w()` to ensure multiple dependency mutations tracked on the the
 * same expression do not result in multiple calls.
 * @param  {CallableFunction} fn
 * @returns ObserverCallback
 */
function queue(fn: ObserverCallback): ObserverCallback {
  return (newValue?: unknown, oldValue?: unknown) => {
    if (!queueStack.size) {
      setTimeout(() => {
        consumingQueue = true;
        queueStack.forEach((fn) => fn(newValue, oldValue));
        queueStack.clear();
        consumingQueue = false;
        nextTicks.forEach((fn) => fn());
        nextTicks.clear();
      });
    }
    !consumingQueue && queueStack.add(fn);
  };
}

/**
 * Adds the ability to listen to the next tick.
 * @param  {CallableFunction} fn?
 * @returns Promise
 */
export function nextTick(fn?: CallableFunction): Promise<unknown> {
  if (!queueStack.size) {
    if (fn) fn();
    return Promise.resolve();
  }
  let resolve: (value?: unknown) => void;
  const p = new Promise((r) => {
    resolve = r;
  });
  nextTicks.add(() => {
    if (fn) fn();
    resolve();
  });
  return p;
}

/**
 * Add a property to the tracked reactive properties.
 * @param  {ReactiveProxy} proxy
 * @param  {DataSourceKey} property
 */
function addDep(proxy: ReactiveProxy, property: DataSourceKey) {
  dependencyCollector.forEach((tracker) => {
    let properties = tracker.get(proxy);
    if (!properties) {
      properties = new Set();
      tracker.set(proxy, properties);
    }
    properties.add(property);
  });
}

function isTpl(template: any): template is ArrowTemplate {
  return typeof template === 'function' && !!(template as ArrowTemplate).isT;
}

function isR(obj: any): obj is ReactiveProxy {
  return typeof obj === 'object' && typeof obj.$on === 'function';
}

function has(obj: DataSource, property: DataSourceKey) {
  return Object.prototype.hasOwnProperty.call(obj, property!);
}

function isReactiveFunction(fn: CallableFunction): fn is ReactiveFunction {
  return has(fn, '$on');
}

function createNodes(html: string): NodeList {
  const tpl: HTMLTemplateElement = document.createElement('template');
  tpl.innerHTML = html;
  const dom = tpl.content.cloneNode(true);
  dom.normalize(); // textNodes are automatically split somewhere around 65kb, so join them back together.
  return dom.childNodes;
}
/**
 * Template partials are stateful functions that perform a fragment render when
 * called, but also have function properties like ._up() which attempts to only
 * perform a patch of the previously rendered nodes.
 * @returns TemplatePartial
 */
function createPartial(group = Symbol()): TemplatePartial {
  let html = '';
  let expressions: ReactiveExpressions = [];
  let chunks: Array<PartialChunk> = [];
  let previousChunks: Array<PartialChunk> = [];
  const keyedChunks: Map<ArrowTemplateKey, PartialChunk> = new Map();
  /**
   * This is the actual document partial function.
   */
  const partial = () => {
    if (!chunks.length) {
      addPlaceholderChunk();
    }
    const dom = assignDomChunks(
      fragment(createNodes(html), expressions)() as DocumentFragment
    );
    reset();
    return dom;
  };
  partial.ch = () => previousChunks;
  partial.l = 0;
  partial.add = (tpl: ArrowTemplate | number | string) => {
    if (!tpl && tpl !== 0) return;
    let template = tpl;
    let localExpressions: ReactiveExpressions = [];
    let key: ArrowTemplateKey;
    isTpl(tpl)
      ? ([template, localExpressions, key] = tpl._h())
      : (tpl = String(tpl));
    html += template;
    html += delimiterComment;
    const keyedChunk = key && keyedChunks.get(key);
    const chunk = keyedChunk || {
      html: template as string,
      exp: localExpressions,
      dom: [],
      tpl,
      key,
    };
    chunks.push(chunk);
    if (key) {
      // Since this is a keyed chunk, we need to either add it to the
      // keyedChunks map, or we need to update the expressions in that chunk.
      keyedChunk
        ? keyedChunk.exp.forEach((exp, i) => exp._up(localExpressions[i].e))
        : keyedChunks.set(key, chunk);
    }
    localExpressions.forEach((callback) => expressions.push(callback));
    partial.l++;
  };

  partial._up = () => {
    const subPartial = createPartial(group);
    let startChunking = 0;
    let lastNode: ChildNode = previousChunks[0].dom[0];
    // If this is an empty update, we need to "placehold" its spot in the dom
    // with an empty placeholder chunk.
    if (!chunks.length) addPlaceholderChunk(document.createComment(''));

    const closeSubPartial = () => {
      if (!subPartial.l) return;
      const frag = subPartial();
      const last = frag.lastChild as ChildNode;
      lastNode[startChunking ? 'after' : 'before'](frag);
      transferChunks(subPartial, chunks, startChunking);
      lastNode = last;
    };

    chunks.forEach((chunk, index) => {
      // There are 3 things that can happen in here:
      // 1. We match a key and output previously rendered nodes.
      // 2. We use a previous rendered dom, and swap the expression.
      // 3. We render totally new nodes using a partial.
      const prev = previousChunks[index];
      if (chunk.key && chunk.dom.length) {
        closeSubPartial();
        // This is a keyed dom chunk that has already been rendered.
        lastNode[index ? 'after' : 'before'](...chunk.dom);
        lastNode = chunk.dom[chunk.dom.length - 1] as ChildNode;
        // Note: we don't need to update keyed chunks expressions here because
        // it is done in partial.add as soon as a keyed chunk is added to the
        // partial.
      } else if (prev && chunk.html === prev.html && !prev.key) {
        // We can reuse the DOM node, and need to swap the expressions. First
        // close out any partial chunks. Then "upgrade" the expressions.
        closeSubPartial();
        prev.exp.forEach((expression, i) => expression._up(chunk.exp[i].e));
        // We always want to reference the root expressions as long as the
        // chunks remain equivalent, so here we explicitly point the new chunk's
        // expression set to the original chunk expression set — which was just
        // updated with the new expression's "values".
        chunk.exp = prev.exp;
        chunk.dom = prev.dom;
        lastNode = chunk.dom[chunk.dom.length - 1];
      } else {
        // Ok, now we're building some new DOM up y'all, let the chunking begin!
        if (!subPartial.l) startChunking = index;
        subPartial.add(chunk.tpl);
      }
    });

    closeSubPartial();
    let node = lastNode.nextSibling;
    while (node && has(node, group)) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
    reset();
  };

  // What follows are internal "methods" for each partial.
  const reset = () => {
    html = '';
    partial.l = 0;
    expressions = [];
    previousChunks = [...chunks];
    chunks = [];
  };

  const addPlaceholderChunk = (node?: Comment) => {
    html = '<!---->';
    chunks.push({
      html,
      exp: [],
      dom: node ? [node] : [],
      tpl: html,
      key: 0,
    });
  };

  const assignDomChunks = (frag: DocumentFragment): DocumentFragment => {
    let chunkIndex = 0;
    const toRemove: ChildNode[] = [];
    frag.childNodes.forEach((node) => {
      if (node.nodeType === 8 && (node as Comment).data === delimiter) {
        chunkIndex++;
        // Remove the comment
        toRemove.push(node as ChildNode);
        return;
      }
      Object.defineProperty(node, group, { value: group });
      chunks[chunkIndex].dom.push(node as ChildNode);
    });
    toRemove.forEach((node) => node.remove());
    return frag;
  };

  const transferChunks = (
    partialA: TemplatePartial,
    chunksB: PartialChunk[],
    chunkIndex: number
  ) => {
    partialA.ch().forEach((chunk, index) => {
      chunksB[chunkIndex + index].dom = chunk.dom;
    });
  };
  return partial;
}

/**
 * The template tagging function, used like: t`<div></div>`(mountEl)
 * @param  {TemplateStringsArray} strings
 * @param  {any[]} ...expressions
 * @returns ArrowTemplate
 */
export function t(
  strings: TemplateStringsArray,
  ...expSlots: any[]
): ArrowTemplate {
  const expressions: ReactiveExpressions = [];
  let str = '';
  const addExpressions = (expression: any, html: string): string => {
    if (typeof expression === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let observer: CallableFunction = () => {};
      expressions.push(
        Object.assign((...args: unknown[]) => expression(...args), {
          e: expression,
          $on: (obs: CallableFunction) => {
            observer = obs;
          },
          _up: (exp: CallableFunction) => {
            expression = exp;
            observer();
          },
        })
      );
      return html + delimiter;
    }
    if (Array.isArray(expression)) {
      return expression.reduce((html, exp) => addExpressions(exp, html), html);
    }
    return html + expression;
  };

  const toString = () => {
    if (!str) {
      str = strings.reduce(function interlaceTemplate(html, strVal, i) {
        html += strVal;
        return expSlots[i] !== undefined
          ? addExpressions(expSlots[i], html)
          : html;
      }, '');
    }
    return str;
  };

  const template: ArrowTemplate = (el?: ParentNode) => {
    const dom = createNodes(toString());
    const frag = fragment(dom, expressions);
    return el ? frag(el) : frag();
  };

  // If the template contains no expressions, it is 100% static so it's key
  // its own content
  template.isT = true;
  template._k = 0 as ArrowTemplateKey;
  template._h = () => [toString(), expressions, template._k];
  template.key = (key: ArrowTemplateKey): ArrowTemplate => {
    template._k = key;
    return template;
  };
  return template;
}

/**
 * @param  {NodeList} dom
 * @param  {ReactiveExpressions} tokens
 * @param  {ReactiveProxy} data?
 */
function fragment(
  dom: NodeList,
  expressions: ReactiveExpressions
): ArrowFragment {
  const frag = document.createDocumentFragment();
  let node: Node | undefined | null;
  while ((node = dom.item(0))) {
    // Bind text nodes to reactive data.
    if (node.nodeType === 3 && node.nodeValue!.length >= 2) {
      frag.append(text(node, expressions));
      continue;
    }

    // Bind attributes, add events, and push onto the fragment.
    if (node instanceof Element) attrs(node, expressions);
    if (node.hasChildNodes()) {
      fragment(node.childNodes, expressions)(node as ParentNode);
    }
    frag.append(node);
    // Select lists "default" selections get out of wack when being moved around
    // inside fragments, this resets them.
    if (node instanceof HTMLOptionElement) node.selected = node.defaultSelected;
  }
  return ((parent?: ParentNode): ParentNode => {
    if (parent) {
      parent.appendChild(frag);
      return parent;
    }
    return frag;
  }) as ArrowFragment;
}

/**
 * Given a node, parse for meaningful expressions.
 * @param  {Element} node
 * @returns void
 */
function attrs(node: Element, expressions: ReactiveExpressions): void {
  if (!node.hasAttributes()) return;
  const total = node.attributes.length;
  const toRemove: string[] = [];
  const attrs = [];
  for (let i = 0; i < total; i++) {
    attrs.push(node.attributes[i]);
  }
  attrs.forEach((attr) => {
    const attrName = attr.name;
    if (attr.value.indexOf(delimiter) !== -1) {
      const expression = expressions.shift() as unknown;
      if (attrName.charAt(0) === '@') {
        node.addEventListener(attrName.substr(1), expression as EventListener);
        toRemove.push(attrName);
      } else {
        w(expression as ReactiveFunction, (value: any) => {
          value !== false
            ? node.setAttribute(attrName, value)
            : node.removeAttribute(attrName);
        });
      }
    }
  });
  toRemove.forEach((attrName) => node.removeAttribute(attrName));
}

/**
 * Given a textNode, parse the node for expressions and return a fragment.
 * @param  {Node} node
 * @param  {ReactiveProxy} data
 * @param  {ReactiveExpressions} tokens
 * @returns DocumentFragment
 */
function text(node: Node, expressions: ReactiveExpressions): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (node.nodeValue!.indexOf(delimiter) === -1) {
    // In this case we really are dealing with a textNode.
    frag.appendChild(node);
    return frag;
  }
  const segments = node.nodeValue!.split(delimiterCapture).filter(Boolean);
  // in this case, we're going to throw the value away because we are creating
  // new nodes, so we remove it from any parent tree.
  (node as ChildNode).remove();
  const partial = createPartial();
  segments.forEach(function eachSegment(txt) {
    if (txt !== delimiter) {
      // this is a simple text node.
      return partial.add(txt);
    }
    // At this point, we know we're dealing with some kind of reactive token fn
    const expression = expressions.shift();
    if (expression && isTpl(expression.e)) {
      // If the expression is an t`` (ArrowTemplate), then call it with data
      // and then call the ArrowTemplate with no parent, so we get the nodes.
      // n = (arrow as ArrowTemplate)(data)();
      partial.add(expression.e);
    } else {
      if (partial.l) {
        frag.appendChild(partial());
      }
      let n: Text | TemplatePartial = document.createTextNode(txt);
      // in this case we have an expression inline as a text node, so we
      // need to reactively bind it here.
      n = w(expression!, (value: any) => setNode(n, value)) as
        | Text
        | TemplatePartial;
      frag.appendChild(n instanceof Node ? n : n());
    }
  });
  if (partial.l) {
    frag.appendChild(partial());
  }
  return frag;
}

/**
 * Set the value of a given node.
 * @param  {Node} n
 * @param  {any} value
 * @param  {ReactiveProxy} data
 * @returns Node
 */
function setNode(
  n: Text | TemplatePartial,
  value: unknown
): Node | TemplatePartial {
  // if (isRenderGroup(value) || !(n instanceof Text) || !value) {
  // If we need to render a template partial, or we need to render a render group (no partial yet)
  if (!Array.isArray(value)) {
    return setNode(n, [value] as RenderGroup);
  }
  const isUpdate = typeof n === 'function';
  const partial = (isUpdate ? n : createPartial()) as TemplatePartial;
  value.forEach((item: string | number | ArrowTemplate) => partial.add(item));
  if (isUpdate) partial._up();
  return partial;
  // }

  // // In this case, we are doing a direct textual replacement.
  // const strVal = String(value);
  // if (strVal !== n.nodeValue) n.nodeValue = strVal;
  // return n;
}

/**
 * Watch a function and track any reactive dependencies on it, re-calling it if
 * those dependencies are changed.
 * @param  {CallableFunction} fn
 * @param  {CallableFunction} after?
 * @returns unknown
 */
export function w(fn: CallableFunction, after?: CallableFunction): unknown {
  const trackingId = Symbol();
  if (!dependencyCollector.has(trackingId)) {
    dependencyCollector.set(trackingId, new Map());
  }
  let currentDeps: Map<ReactiveProxy, Set<DataSourceKey>> = new Map();
  const queuedCallFn = queue(callFn);
  function callFn() {
    dependencyCollector.set(trackingId, new Map());
    const value: unknown = fn();
    const newDeps = dependencyCollector.get(trackingId) as Map<
      ReactiveProxy,
      Set<DataSourceKey>
    >;
    dependencyCollector.delete(trackingId);

    // Disable existing properties
    currentDeps.forEach((propertiesToUnobserve, proxy) => {
      const newProperties = newDeps.get(proxy);
      if (newProperties) {
        newProperties.forEach((prop) => propertiesToUnobserve.delete(prop));
      }
      propertiesToUnobserve.forEach((prop) => proxy.$off(prop, queuedCallFn));
    });
    // Start observing new properties.
    newDeps.forEach((properties, proxy) => {
      properties.forEach((prop) => proxy.$on(prop, queuedCallFn));
    });
    currentDeps = newDeps;
    return after ? after(value) : value;
  }
  // If this is a reactive function, then when the expression is updated, re-run
  if (isReactiveFunction(fn)) fn.$on(callFn);
  return callFn();
}

/**
 * Given two reactive proxies, merge the important state attributes from the
 * source into the target.
 * @param  {ReactiveProxy} reactiveTarget
 * @param  {ReactiveProxy} reactiveSource
 * @returns ReactiveProxy
 */
function reactiveMerge(
  reactiveTarget: ReactiveProxy,
  reactiveSource: ReactiveProxy
): ReactiveProxy {
  const state = reactiveSource._st();
  if (state.o) {
    state.o.forEach((callbacks, property) => {
      callbacks.forEach((c) => {
        reactiveTarget.$on(property, c);
      });
    });
  }
  if (state.p) {
    reactiveTarget._p = state.p;
  }
  return reactiveTarget;
}

function arrayOperation(
  op: string,
  arr: Array<unknown>,
  proxy: ReactiveProxy,
  native: unknown
) {
  const synthetic = (...args: any[]) => {
    // The `as DataSource` here should really be the ArrayPrototype, but we're
    // just tricking the compiler since we've already checked it.
    const retVal = (Array.prototype as DataSource)[op].call(arr, ...args);
    // @todo determine how to handle notifying elements and parents of elements.
    arr.forEach((item, i) => proxy._em(String(i), item));
    // Notify the the parent of changes.
    if (proxy._p) {
      const [property, parent] = proxy._p;
      parent._em(property, proxy);
    }
    return retVal;
  };
  switch (op) {
    case 'shift':
    case 'pop':
    case 'sort':
    case 'reverse':
    case 'copyWithin':
      return synthetic;
    case 'unshift':
    case 'push':
    case 'fill':
      return (...args: any[]) => synthetic(...args.map((arg) => r(arg)));
    case 'splice':
      return (start: number, remove?: number, ...inserts: any[]) =>
        synthetic(start, remove, ...inserts.map((arg) => r(arg)));
    default:
      return native;
  }
}

/**
 * Given a data object, often an object literal, return a proxy of that object
 * with mutation observers for each property.
 *
 * @param  {DataSource} data
 * @returns ReactiveProxy
 */
export function r(
  data: DataSource,
  state: ReactiveProxyState = {}
): ReactiveProxy {
  // If this is already reactive or a non object, just return it.
  if (isR(data) || typeof data !== 'object') return data;
  // This is the observer registry itself, with properties as keys and callbacks as watchers.
  const observers: ReactiveProxyObservers = state.o || new Map();
  // This is a reverse map of observers with callbacks as keys and properties that callback is watching as values.
  const observerProperties: ReactiveProxyPropertyObservers =
    state.op || new Map();
  // If the data is an array, we should know...but only once.
  const isArray = Array.isArray(data);

  // The add/remove dependency function(s)
  const dep = (a: 'add' | 'delete') => (
    p: DataSourceKey,
    c: ObserverCallback
  ) => {
    let obs = observers.get(p);
    let props = observerProperties.get(c);
    if (!obs) {
      obs = new Set<ObserverCallback>();
      observers.set(p, obs);
    }
    if (!props) {
      props = new Set<DataSourceKey>();
      observerProperties.set(c, props);
    }
    obs[a](c);
    props![a](p);
  };
  // Add a property listener
  const $on = dep('add');
  // Remove a property listener
  const $off = dep('delete');
  // Emit a property mutation event by calling all sub-dependencies.
  const _em = (
    property: DataSourceKey,
    newValue: any,
    oldValue?: any
  ): void => {
    observers.has(property) &&
      observers.get(property)!.forEach((c) => c(newValue, oldValue));
  };

  /**
   * Return the reactive proxy state data.
   */
  const _st = (): ReactiveProxyState => {
    return {
      o: observers,
      op: observerProperties,
      r: data,
      p: proxy._p,
    };
  };

  // These are the internal properties of all `r()` objects.
  const depProps: DependencyProps = {
    $on, // Listen to properties
    $off, // Stop listening to properties
    _em, // Emit a change event for a given property
    _st,
    _p: undefined,
  };

  // Create the actual proxy object itself.
  const proxy = new Proxy(data, {
    get(...args) {
      const [, p] = args;
      // For properties of the DependencyProps type, return their values from
      // the depProps instead of the target.
      if (Reflect.has(depProps, p)) return Reflect.get(depProps, p);

      const value = Reflect.get(...args);
      // For any existing dependency collectors that are active, add this
      // property to their observed properties.
      addDep(proxy, p);

      // We have special handling of array operations to prevent O(n^2) issues.
      if (isArray && has(Array.prototype, p)) {
        return arrayOperation(
          p as string,
          data as Array<unknown>,
          proxy,
          value
        );
      }
      return value;
    },
    set(...args) {
      const [target, property, value] = args;
      const old = Reflect.get(target, property);
      if (Reflect.has(depProps, property)) {
        // We are setting a reserved property like _p
        return Reflect.set(depProps, property, value);
      }

      if (value && typeof value === 'object' && isR(old)) {
        // We're assigning an object (array or pojo probably), so we want to be
        // reactive, but if we already have a reactive object in this
        // property, then we need to replace it and transfer the state of deps.
        const oldState = old._st();
        const newR = isR(value)
          ? reactiveMerge(value, old)
          : r(value, oldState);
        Reflect.set(
          target,
          property,
          // Create a new reactive object
          newR
        );
        _em(property, newR);
        // After assignment, we need to check all observers of the new property
        // and see if any of their respective values changed during the
        // assignment.
        (oldState.o as ReactiveProxyObservers).forEach((_c, property) => {
          const oldValue = Reflect.get(old, property!);
          const newValue = Reflect.get(newR, property!);
          if (oldValue !== newValue) {
            old._em(property, newValue, oldValue);
          }
        });
        return true;
      }
      const didSet = Reflect.set(...args);
      if (didSet) {
        if (old !== value) {
          // Notify any discrete property observers of the change.
          _em(property, value, old);
        }
        if (proxy._p) {
          // Notify parent observers of a change.
          proxy._p[1]._em(...proxy._p);
        }
      }
      return didSet;
    },
  }) as ReactiveProxy;

  // Before we return the proxy object, quickly map through the values to ensure
  // any nested objects are reactive.
  // Note: this is only run on the initial setup.
  for (const property in data) {
    if (typeof data[property] === 'object') {
      if (!isR(data[property])) {
        data[property] = r(data[property]);
      }
      proxy[property]._p = [property, proxy];
    }
  }
  return proxy;
}
