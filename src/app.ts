import express, { type Request, type Response } from "express";
import fixedWindowCounter from "./fixedWindowCounter";
import slidingWindowLog from "./slidingWindowLog";
const app = express();

// fixed window counter
app.get('/fixed-window-counter', fixedWindowCounter, (req: Request, res: Response) => {
   res.json({
      succss: true,
      message: "request sent successfully"
   })
})

// sliding winodw log
app.get('/sliding-window-log', slidingWindowLog, (req: Request, res: Response) => {
   res.json({
      succss: true,
      message: "request sent successfully"
   })
})


export default app;