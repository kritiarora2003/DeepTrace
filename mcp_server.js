const express = require("express");


const app = express();
app.use(express.json());
const { tools } = require("./tools");
app.get("/tools", (req, res) =>{
    res.json(
        Object.entries(tools).map(([name,tools]) =>({
            name,
            description: tools.description,
            input_schema: tools.schema.shape
        }))
    )
})
app.post("/tools/:tool_name", async(req, res) =>{
    const tool = tools[req.params.tool_name];
    if(!tool){
        return res.status(404).json({ error: "Tool not found" });
    }
    try{
        const args = tool.schema.parse(req.body);
        const result = await tool.execute(args);
        res.json(result);   
    }catch(e){
        res.status(400).json({ error: e.errors ? e.errors : e.message });
    }
})

app.listen(3000, (req, re) =>{
    console.log("MCP Server running on http://localhost:3000");
})