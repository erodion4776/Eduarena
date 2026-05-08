async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/oracle/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello' })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
