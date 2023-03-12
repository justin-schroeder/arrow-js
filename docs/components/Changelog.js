import { html } from '@src/index'

export default function () {
  return html`
    <h1 id="changelog">Changelog</h1>
    <h2>Alpha 8</h2>
    <ul>
      <li>
        Fixes an issue with setting
        <a href="https://developer.mozilla.org/en-US/docs/Glossary/IDL"
          >IDL attributes</a
        >
        reactively multiple times.
      </li>
    </ul>
    <h2>Alpha 7</h2>
    <ul>
      <li>
        Introduces a dot <code>.</code> prefix for setting the an element’s
        <a href="https://developer.mozilla.org/en-US/docs/Glossary/IDL"
          >IDL attribute</a
        >
        (<a href="https://github.com/justin-schroeder/arrow-js/issues/33">#33</a
        >).
      </li>
      <li>
        Fixes a bug that could leave behind non-reactive template partials on
        update when those partials were not the first or last DOM node children.
        (<a href="https://github.com/justin-schroeder/arrow-js/issues/49">#49</a
        >).
      </li>
      <li>
        Replaces empty templates with a comment node to prevent an exception
        from being thrown (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/37"
          >#37</a
        >).
      </li>
      <li>
        Checkboxes now set the <code>checked</code> IDL attribute rather than
        the content attribute (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/40"
          >#40</a
        >).
      </li>
    </ul>
    <h2>Alpha 6</h2>
    <ul>
      <li>
        Fixes an issue that cased watchers that modified reactive data to not
        properly queue their own effects (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/31"
          >#31</a
        >).
      </li>
    </ul>
    <h2>Alpha 5</h2>
    <ul>
      <li>
        Binding the <code>value</code> attribute of input, textarea, and select
        elements now changes the IDL property instead of the content attribute
        (<a href="https://github.com/justin-schroeder/arrow-js/issues/31">#31</a
        >).
      </li>
      <li>
        Removes event listeners from Nodes that are removed from the DOM (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/11"
          >#11</a
        >).
      </li>
    </ul>
    <h2>Alpha 4</h2>
    <ul>
      <li>Fixes a bug in keyed list rendering when unshifting.</li>
    </ul>
    <h2>Alpha 3</h2>
    <ul>
      <li>
        Fixes a bug that caused unnecessary DOM patches on keyed lists (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/36"
          >#36</a
        >, thanks @jukart).
      </li>
    </ul>
    <h2>Alpha 2</h2>
    <ul>
      <li>
        Improved markup sanitation (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/18"
          >#18</a
        >).
      </li>
      <li>
        Improved token replacement to prevent incorrectly structured tables (<a
          href="https://github.com/justin-schroeder/arrow-js/issues/17"
          >#17</a
        >).
      </li>
      <li>
        Adds <code>reactive</code>, <code>watch</code>, and
        <code>html</code> aliases.
      </li>
    </ul>
    <h2>Alpha 1</h2>
    <ul>
      <li>Initial public release of ArrowJS.</li>
    </ul>
  `
}
