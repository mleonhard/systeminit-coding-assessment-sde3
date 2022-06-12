# mleonhard/systeminit-coding-assessment-sde3

An ephemeral bulletin board web app.
This is my implementation of <https://github.com/systeminit/coding-assessment-sde3>.

It uses:
- [Rust](https://www.rust-lang.org/)
- [Beatrice web server library](https://crates.io/crates/beatrice).  I made it.
  It uses async Rust and runs your non-async request handlers on a threadpool.
  It gives you the scalability of async without having to write any async code.
- [Safina async runtime](https://crates.io/crates/safina).  I made it.
  I made Safina to see if it was possible to write a Rust async runtime with `forbid(unsafe_code)`.
  I learned a lot about Rust and async Rust while writing it.
- [TypeScript](https://www.typescriptlang.org/)
- [Vue.js](https://vuejs.org/)
- [TailwindCSS](https://tailwindcss.com/)

## How to Use
1. Install Rust, NodeJS, and `@vue/cli`.
2. Start the server:
   ```
   $ ./build-and-run.sh
   ```
3. Connect to the server with a web browser: <http://localhost:8000/>
4. Enter a message in the box and tap the "Add" button.
5. Refresh the page to see new messages.

## Screenshots
![A browser window showing Ephemeral Bulletin Board app with some messages](screenshot.png)

![A browser window showing Ephemeral Bulletin Board app showing an error message](screenshot-error.png)

## Development
Vue's dev server does not support hot-reload with Typescript.
To see your changes, press CTRL-C to stop the server, run `build-and-run.sh` again,
and refresh the page.

## Testing
Run the server tests:
```
$ cargo test
```

## TO DO
- Show an activity indicator while loading or adding a message.
- Focus the message box again after trying to add a message.
- Store messages in a database
- Stop sanitizing output since Vue seems to do that automatically.
- Measure test coverage
- Test the frontend with end-to-end tests.
- Test `MessageListModel`
- Test `doRpc()` which contains some complicated logic.  Or find a good library to use instead.
