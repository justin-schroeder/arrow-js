import { nextTick, r, w } from '../src';

describe('r', () => {
  it('allows simple property access', () => {
    const reactive = r({ x: 123, y: 'abc' });
    expect(reactive.x).toBe(123);
    expect(reactive.y).toBe('abc');
  });

  it('allows setting properties', () => {
    const reactive = r({});
    expect(reactive.x).toBe(undefined);
    reactive.x = 'foo';
    expect(reactive.x).toBe('foo');
  });

  it('allows setting properties', () => {
    const reactive = r({});
    expect(reactive.x).toBe(undefined);
    reactive.x = 'foo';
    expect(reactive.x).toBe('foo');
  });

  it('can record dependencies', async () => {
    const reactive = r({
      a: 'foo',
      b: 'boo',
      c: 'can',
      bar: {
        baz: 'caz',
      },
    });
    const x = jest.fn(() => reactive.a + reactive.c);
    w(x);
    reactive.foo = 'bar'; // should not trigger since it wasnt recorded.
    reactive.a = 'hello';
    await nextTick();
    expect(x.mock.calls.length).toBe(2);
    expect(x.mock.results[1].value).toBe('hellocan');
  });

  it('allows simple observation registration', async () => {
    const reactive = r({
      foo: 'bar',
      bar: 'foo',
    });
    const listener = jest.fn();
    reactive.$on('bar', listener);
    reactive.foo = 'hello';
    await nextTick();
    expect(listener.mock.calls.length).toBe(0);
    reactive.bar = 'baz';
    await nextTick();
    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0]).toEqual(['baz', 'foo']);
  });

  it('can stop listening to changes', async () => {
    const reactive = r({
      foo: 'bar',
      bar: 'foo',
    });
    const listener = jest.fn();
    reactive.$on('bar', listener);
    reactive.bar = 'baz';
    await nextTick();
    expect(listener.mock.calls.length).toBe(1);
    reactive.$off('bar', listener);
    reactive.bar = 'fizz';
    await nextTick();
    expect(listener.mock.calls.length).toBe(1);
  });

  it('can track dependencies on shadow properties when they are lit up', async () => {
    const reactive = r({
      value: 0,
      name: 'Bob',
    });
    const hasName = () => (reactive.value > 0.5 ? reactive.name : 'nothing');
    const setValue = jest.fn();
    w(hasName, setValue);
    expect(setValue.mock.calls.length).toBe(1);
    reactive.name = 'Jonny';
    await nextTick();
    expect(setValue.mock.calls.length).toBe(1);
    reactive.value = 1;
    await nextTick();
    expect(setValue.mock.calls.length).toBe(2);
    reactive.name = 'Jill';
    await nextTick();
    expect(setValue.mock.calls.length).toBe(3);
  });

  it('consolidates identical watcher expressions', async () => {
    const data = r({
      list: ['a', 'b', 'c'],
    });
    const callback = jest.fn();
    w(() => data.list.map((item: string) => item), callback);
    expect(callback.mock.calls.length).toBe(1);
    data.list.unshift('first');
    await nextTick();
    expect(callback.mock.calls.length).toBe(2);
  });

  it('untracks dependencies that fall back into shadow', async () => {
    const reactive = r({
      value: 0,
      name: 'Bob',
    });
    const hasName = () => (reactive.value > 0.5 ? reactive.name : 'nothing');
    const setValue = jest.fn();
    w(hasName, setValue);
    expect(setValue.mock.calls.length).toBe(1);
    reactive.value = 1;
    reactive.name = 'hello';
    await nextTick();
    expect(setValue.mock.calls.length).toBe(2);
    reactive.value = 0;
    await nextTick();
    expect(setValue.mock.calls.length).toBe(3);
    reactive.name = 'molly';
    await nextTick();
    expect(setValue.mock.calls.length).toBe(3);
  });

  it('is able to track dependencies on nested tracking calls', async () => {
    const reactive = r({
      value: 0,
      name: 'Bob',
      location: 'Big City',
    });
    const hasNameCb = jest.fn();
    const printNameCb = jest.fn();

    function printName() {
      return reactive.name;
    }
    function hasName(): void | string {
      if (reactive.value > 1) {
        w(printName, printNameCb);
      }
    }
    w(hasName, hasNameCb);
    expect(hasNameCb.mock.calls.length).toBe(1);
    expect(printNameCb.mock.calls.length).toBe(0);
    reactive.value = 2;
    await nextTick();
    expect(printNameCb.mock.calls.length).toBe(1); // Previously shadowed
    expect(hasNameCb.mock.calls.length).toBe(2);
    reactive.name = 'hello';
    await nextTick();
    expect(hasNameCb.mock.calls.length).toBe(3);
  });

  it('is able to react to nested reactive object mutations', async () => {
    const data = r({
      first: 'Justin',
      user: { last: 'Schroeder', username: 'bob1999' },
    });
    const callback = jest.fn();
    w(() => data.user.last, callback);
    expect(callback.mock.calls.length).toBe(1);
    data.user.last = 'Poppies';
    await nextTick();
    expect(callback.mock.calls.length).toBe(2);
    expect(callback.mock.calls[1][0]).toBe('Poppies');
  });

  it('can does not call observers from previous reactive objects that didnt change', () => {
    const data = r({
      list: [{ name: 'fred' }],
    });
    const callback = jest.fn();
    data.list[0].$on('name', callback);
    data.list[0] = { name: 'fred' };
    expect(callback.mock.calls.length).toBe(0);
  });

  it('can merge existing recursive object observers', () => {
    const user = r({ name: 'fred' });
    const data = r({
      users: [{ name: 'ted' }],
    });
    const listObserver = jest.fn();
    const userObserver = jest.fn();
    data.users[0].$on('name', listObserver);
    user.$on('name', userObserver);
    data.users[0] = user;
    expect(listObserver.mock.calls.length).toBe(1);
    expect(userObserver.mock.calls.length).toBe(0);
  });

  it('is able to de-register nested dependencies when they move into logical shadow', async () => {
    const data = r({
      first: 'Bob',
      user: { last: 'Schroeder', username: 'bob1999' },
    });
    const callback = jest.fn();
    w(
      () => (data.first === 'Justin' ? '@jpschroeder' : data.user.username),
      callback
    );
    expect(callback.mock.calls.length).toBe(1);
    data.user.username = 'poppy22';
    await nextTick();
    expect(callback.mock.calls.length).toBe(2);
    expect(callback.mock.calls[1][0]).toBe('poppy22');
    data.first = 'Justin';
    await nextTick();
    expect(callback.mock.calls.length).toBe(3);
    data.user.username = 'jenny33';
    await nextTick();
    expect(callback.mock.calls.length).toBe(3);
  });

  it('will notify the root property of array mutations', () => {
    const data = r({
      list: ['a', 'b'],
    });
    const callback = jest.fn();
    data.$on('list', callback);
    data.list.push('c');
    expect(callback.mock.calls.length).toBe(1);
  });

  it('will notify the root property of array mutations on newly assigned nested r', () => {
    const data = r({
      list: [],
    });
    const callback = jest.fn();
    data.$on('list', callback);
    data.list.push('c');
    expect(callback.mock.calls.length).toBe(1);
    data.list = r(['a', 'b']);
    expect(callback.mock.calls.length).toBe(2);
    data.list.push('c');
    expect(callback.mock.calls.length).toBe(3);
  });

  it('will notify root observers on objects of property mutations', () => {
    const data = r({
      food: {
        fruit: 'apple',
      },
    });
    const callback = jest.fn();
    data.$on('food', callback);
    data.food.breakfast = 'eggs';
    expect(callback.mock.calls.length).toBe(1);
  });

  it('can automatically swap object dependency and update listeners on it’s properties', () => {
    const data = r({
      user: {
        name: 'Justin',
      },
    });
    const callback = jest.fn();
    data.user.$on('name', callback);
    expect(callback.mock.calls.length).toBe(0);
    data.user.name = 'Dustin';
    expect(callback.mock.calls.length).toBe(1);
    data.user = { name: 'Frank' };
    expect(callback.mock.calls.length).toBe(2);
  });

  it('can observe multiple data objects in watcher', async () => {
    const a = r({ price: 45 });
    const b = r({ quantity: 25 });
    const callback = jest.fn();
    w(() => a.price * b.quantity, callback);
    expect(callback.mock.calls[0][0]).toBe(1125);
    a.price = 100;
    await nextTick();
    expect(callback.mock.calls[1][0]).toBe(2500);
    b.quantity = 5;
    await nextTick();
    expect(callback.mock.calls[2][0]).toBe(500);
  });
});
