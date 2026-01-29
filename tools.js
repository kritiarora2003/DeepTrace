const { z } = require("zod");
const tools = {
    get_time : {
        description: "Get the current system time.",
        schema : z.object({}),
        execute: async() => {
            return { time: new Date().toISOString() };
        }
    },
    echo : {
        description: "Echo back the provided message.",
        schema : z.object({
            message: z.string().min(1).max(500)
        }),
        execute: async({ message }) => {
            return { echoed_message: message };
        }
    }

}
module.exports = { tools };