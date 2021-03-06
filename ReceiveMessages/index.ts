import { delay, isServiceBusError, ProcessErrorArgs, ServiceBusClient, ServiceBusMessage, ServiceBusReceivedMessage, ServiceBusReceiverOptions, ServiceBusSessionReceiverOptions, SubscribeOptions} from "@azure/service-bus";
import moment from "moment";
import {AzureFunction, Context, HttpRequest} from "@azure/functions"

const _start = moment();
const queueName = "test";
let _messages = 0;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void>  {
    context.log('Start Receiving');
    
    const connectionString = process.env.SB_CONN_STR || "<connection string>";
    const sbClient = new ServiceBusClient(connectionString);
    const sessionId = "session-1";
    // const queueName = "test";
    
    await receiveMessages(40000)
    context.res = {
      status: 200
      };
    context.log('The End');
    
};

async function receiveMessages(allmsg: number) {
  
  const maxConcurrentCalls = 100;
  const allMessages = allmsg;

  const writeResultsPromise = WriteResults(allMessages);
  await RunTest("session-1",maxConcurrentCalls, allMessages);
  await writeResultsPromise;
}

async function  RunTest(
  sessionId: string,
  maxConcurrentCalls: number,
  messages: number
): Promise<void> {
  const connectionString = process.env.SB_CONN_STR || "<connection string>";
  const sbClientLocal = new ServiceBusClient(connectionString);
  const options:ServiceBusSessionReceiverOptions = {receiveMode:"receiveAndDelete"};
  const receiver = await sbClientLocal.acceptSession(queueName, sessionId, options);
  const subscribeOptions:SubscribeOptions = {maxConcurrentCalls:maxConcurrentCalls,autoCompleteMessages:false};

   const subscription = receiver.subscribe({
        // After executing this callback you provide, the receiver will remove the message from the queue if you
        // have not already settled the message in your callback.
        // You can disable this by passing `false` to the `autoCompleteMessages` option in the `subscribe()` method.
        // If your callback _does_ throw an error before the message is settled, then it will be abandoned.
        
        processMessage: async (brokeredMessage: ServiceBusReceivedMessage) => {
          _messages++;
          if (_messages === messages){
            await receiver.close();
            await sbClientLocal.close();
          }
          
        },
        
        // This callback will be called for any error that occurs when either in the receiver when receiving the message
        // or when executing your `processMessage` callback or when the receiver automatically completes or abandons the message.
        processError: async (args: ProcessErrorArgs) => {
          console.log(`Error from source ${args.errorSource} occurred: `, args.error);
  
          // the `subscribe() call will not stop trying to receive messages without explicit intervention from you.
          if (isServiceBusError(args.error)) {
            switch (args.error.code) {
              case "MessagingEntityDisabled":
              case "MessagingEntityNotFound":
              case "UnauthorizedAccess":
                // It's possible you have a temporary infrastructure change (for instance, the entity being
                // what is considered fatal for your program.
                console.log(
                  `An unrecoverable error occurred. Stopping processing. ${args.error.code}`,
                  args.error
                );
                await subscription.close();
                break;
              case "MessageLockLost":
                console.log(`Message lock lost for message`, args.error);
                break;
              case "ServiceBusy":
                // choosing an arbitrary amount of time to wait.
                await delay(1000);
                break;
            }
          }
        }
      },subscribeOptions);
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
  Log(
    `\tTot Msg\t${totalMessages}` +
      `\tCur MPS\t${Math.round((currentMessages * 1000) / currentElapsed)}` +
      `\tAvg MPS\t${Math.round((totalMessages * 1000) / totalElapsed)}` +
      `\tMax MPS\t${Math.round((maxMessages * 1000) / maxElapsed)}`
  );
}

function Log(message: string): void {
  console.log(`[${moment().format("hh:mm:ss.SSS")}] ${message}`);
}


export default httpTrigger;
