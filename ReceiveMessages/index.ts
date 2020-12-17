import { delay, ProcessErrorArgs, ServiceBusClient, ServiceBusMessage, ServiceBusReceiverOptions} from "@azure/service-bus";
import moment from "moment";
import {AzureFunction, Context, HttpRequest} from "@azure/functions"

const _start = moment();
let _messages = 0;
    const connectionString = process.env.SB_CONN_STR as string;
    const queueName = "test";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void>  {
    context.log('Start Receiving', req.body);
    

    
    // const queueName = process.env.QUEUE_NAME_WITH_SESSIONS || "<queue name>";



    const maxConcurrentCalls = 10;
    const messages = 1000;



    // Endpoint=sb://<your-namespace>.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<shared-access-key>

    context.log(`Maximum Concurrent Calls: ${maxConcurrentCalls}`);
    context.log(`Total messages: ${messages}`);

    const writeResultsPromise = WriteResults(messages);

    await RunTest(connectionString, queueName, maxConcurrentCalls, messages);
    await writeResultsPromise;
    
};

    async function RunTest(
      connectionString: string,
      queueName: string,
      maxConcurrentCalls: number,
      messages: number
    ): Promise<void> {
      const ns = new ServiceBusClient(connectionString);
      const options:ServiceBusReceiverOptions = {receiveMode:"receiveAndDelete"};

      const receiver = ns.createReceiver(queueName,options);
      // const receiver = await ns.acceptSession(queueName, sessionId);

      const processMessage = async (message: ServiceBusMessage) => {
        console.log(`Received: ${message.sessionId} - ${message.body} `);
      };
      const processError = async (args: ProcessErrorArgs) => {
        console.log(`>>>>> Error from error source ${args.errorSource} occurred: `, args.error);
      };
      receiver.subscribe({
        processMessage,
        processError
      });
    
      await delay(10000);
    
      await receiver.close();

    }

    async function WriteResults(messages: number): Promise<void> {
      let lastMessages = 0;
      let lastElapsed = 0;
      let maxMessages = 0;
      let maxElapsed = Number.MAX_SAFE_INTEGER;

      do {
        await delay(1000);

        const receivedMessages = _messages;
        const currentMessages = receivedMessages - lastMessages;
        lastMessages = receivedMessages;

        const elapsed = moment().diff(_start);
        const currentElapsed = elapsed - lastElapsed;
        lastElapsed = elapsed;

        if (currentMessages / currentElapsed > maxMessages / maxElapsed) {
          maxMessages = currentMessages;
          maxElapsed = currentElapsed;
        }

        WriteResult(
          receivedMessages,
          elapsed,
          currentMessages,
          currentElapsed,
          maxMessages,
          maxElapsed
        );
      } while (_messages < messages);
    }

    function WriteResult(
      totalMessages: number,
      totalElapsed: number,
      currentMessages: number,
      currentElapsed: number,
      maxMessages: number,
      maxElapsed: number
    ): void {
      log(
        `\tTot Msg\t${totalMessages}` +
          `\tCur MPS\t${Math.round((currentMessages * 1000) / currentElapsed)}` +
          `\tAvg MPS\t${Math.round((totalMessages * 1000) / totalElapsed)}` +
          `\tMax MPS\t${Math.round((maxMessages * 1000) / maxElapsed)}`
      );
}

function log(message: string): void {
  console.log(`[${moment().format("hh:mm:ss.SSS")}] ${message}`);
}

export default httpTrigger;
