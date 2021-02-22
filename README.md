# ArrowJS

Features:

- The smallest (probably) reactive JavaScript library.
- Static by default, reactive by choice.
- Ultra fast DOM manipulation.
- Zero dependencies.
- No build tools required (or even suggested).

## Usage

Arrow provides two top level functions: `r` (think "reactive") and `t` (think template). The two functions work together well, but are not tightly coupled — in particular the `r` function could be used to make reactive data sets with no rendering. Let's take a look:

## Reactive data

The `r` function's primary duty is to transform a generic data object into an
"observed" data object. For the purposes of this documentation, we'll call these
"reactive" data objects. Converting your data object into a reactive object is
as simple as wrapping it in an `r()` call:

```js
const hero = r({
  first: 'Peter',
  last: 'Pan'
})
console.log(`Hello ${hero.first} ${hero.last}.`)
// Hello Peter Pan
```

### Observing changes

If we wanted to know when our hero's first name is changed, we can observe that
change using the `$on` method.

```js
const hero = r({
  first: 'Peter',
  last: 'Pan'
})

hero.$on('first', () => console.log(`Hello ${hero.first} ${hero.last}`))
console.log(`Hello ${hero.first} ${hero.last}`)
// Hello Peter Pan
hero.first = 'Tinker'
// Hello Tinker Pan
```

Perfect! Well...those `console.log` statements are duplicate code, and we're not observing any changes on the `last` property.

Actually — this is a good time to mention that Arrow’s approach to reactivity is intentionally constrained. In other words, Arrow only makes data "reactive" that is explicitly flagged as such. This is actually good news, it means a few positive things:

  - Smaller footprint. Arrow's reactivity system is tiny and fast.
  - Reactive vs non reactive data is clearly visible in code.
  - Fewer unintended side effects when mutating data.

The `$on` method is a good example of this constraint in practice — to observe both the `first` and `last` name — you need to explicitly observe both of those properties. Sounds tedious, but the good news is Arrow can record which properties to observe automatically. Let's reconsider our hero's name:

```js
const hero = r({
  first: 'Peter',
  middle: 'Juniper',
  last: 'Pan'
});
hero._do(() => console.log(`Hello ${hero.first} ${hero.last}`))
// Hello Peter Pan
hero.first = 'Tinker'
// Hello Tinker Pan
hero.last = 'Bell'
// Hello Tinker Bell
hero.middle = 'Oakiford'
// No console log, because middle is not observed
```

The `_do` method will observe which properties are utilized and re-call your function with the updated data.

### Nested Data

So if your data object has nested data objects or arrays, they will automatically be converted to reactive objects as well:

```js
const fan = r({
  username: 'sports4ever',
  teams: r(['Yankees', 'Chiefs', 'Barcelona'])
});
fan._do(() => fan.teams.map(team => console.log(team)))
// Yankees
// Chiefs
// Barcelona
fan.push('AC Milan')
// Yankees
// Chiefs
// Barcelona
// AC Milan
```

## Templates

Rendering HTML in JavaScript can be a challenging experience — there are so many
template "languages" it’s hard to even count. Instead of learning a new language
Arrow allows you to write your HTML using...drumroll...HTML 👀. The only
"template language" you need to know is native JavaScript:

```js
const data = { name: 'darkness' }
t`<div class="greeting">Hello ${data.name} my old friend</div>`(data)
```
The `t()` function returns a function that allows you to pass in the data object you wish to observe. That function returns another function that expects an `HTMLElement` to mount itself inside. Sound's complex, but it's not. Let's assume you have an `index.html` file with a container to mount our app:

```js
const app = document.getElementById('app')

const data = { name: 'darkness' }
const rawTemplate = t`<div class="greeting">Hello ${data.name} my old friend</div>`
const dataTemplate = rawTemplate(data)
dataTemplate(app) // mounts to #app element
```
However, the above data and mounting can be simplified and beautified by chaining the data and mounting calls to the end of the template literal:

```js
const data = { name: 'darkness' }
t`
<div class="greeting">
  Hello ${data.name} my old friend
</div>`(data)(document.getElementById('app'))
```

### Reactive template expressions

Template expressions are, by definition, literal pre-computed and static. Meaning, when you write templates using Arrow's `t` function, the templates are inherently static. This is an excellent _feature_ because it assumes that most of the time you are using data in your template, that data is static and will not change — as such it should be not be considered part of the reactive block of the template.

Let's say we are developing a blog, if we are rendering an article page, the content of that article page will only ever need to be evaluated once — that title is not going to change when someone is reading the article.

```js
function renderArticle (mountTo) {
  // The article data, but this could be fetched from an API.
  const article = r({
    title: 'The legumes of southern France'
  });
  t`<article>
      <h1>${article.title}</h1>
    </article>`(article)(mountTo)
}
```

Even though the article object is marked as reactive with the `r` function that article title will not be updated if we change the `article.title` value. This means the template parser doesn't need to worry about it, dependency tracking doesn't need to worry about it, and it is rendered with virtually no cost. This is the _default_ state for writing templates with Arrow. This is good. This is right.

What if our blog posts have a "clap" feature like Medium.com uses? In that case, we want reactivity, and we want it now (but without all the hassle please)! Let's take our previous example and add some clappy-hands.


```js
function renderArticle (mountTo) {
  // The article data, but this could be fetched from an API.
  const article = r({
    title: 'The legumes of southern France',
    claps: 134
  });
  t`<article>
      <a>
        👏 ${() => article.claps} claps
      </a>
      <h1>${article.title}</h1>
    </article>`(article)(mountTo)
}
```

Notice the subtle difference? All we did to make our expression reactive was convert it to an arrow function (thus the name Arrow 💡). Now if we change the value of `article.claps` our template will automatically update. That's it.

### Attributes?

### Lists?

### Computed props?

### Events?

### Best Practices and Rules

- Use Keys as often as possible!
- Don't modify data objects in expressions!
- Pure functions good, side effects bad!
- Use the VSCode extension!
