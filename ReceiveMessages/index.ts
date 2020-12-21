import { delay, isServiceBusError, ProcessErrorArgs, ServiceBusClient, ServiceBusMessage, ServiceBusReceivedMessage, ServiceBusReceiverOptions, ServiceBusSessionReceiverOptions, SubscribeOptions} from "@azure/service-bus";
import moment from "moment";
import {AzureFunction, Context, HttpRequest} from "@azure/functions"

const _start = moment();

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void>  {
    context.log('Start Receiving');
    
    const connectionString = process.env.SB_CONN_STR || "<connection string>";
    const sbClient = new ServiceBusClient(connectionString);
    const sessionId = "session-1";
    const queueName = "test";
    
    await receiveMsg(sbClient,sessionId,queueName)
    context.res = {
      status: 200
      };
    context.log('The End');
    
};

async function receiveMsg(sbClient: ServiceBusClient, sessionId: string, queueName: string) {

  // - If receiving from a subscription you can use the createReceiver(topicName, subscriptionName) overload
  // instead.
  // - See session.ts for how to receive using sessions.
  // const receiver = sbClient.createReceiver(queueName);
  const options:ServiceBusSessionReceiverOptions = {receiveMode:"receiveAndDelete"};
  const receiver = await sbClient.acceptSession(queueName, sessionId, options);
  const subscribeOptions:SubscribeOptions = {maxConcurrentCalls:100,autoCompleteMessages:false};
  let msgc = 0;
  try {
    const subscription = receiver.subscribe({
      // After executing this callback you provide, the receiver will remove the message from the queue if you
      // have not already settled the message in your callback.
      // You can disable this by passing `false` to the `autoCompleteMessages` option in the `subscribe()` method.
      // If your callback _does_ throw an error before the message is settled, then it will be abandoned.
      
      processMessage: async (brokeredMessage: ServiceBusReceivedMessage) => {
        msgc++;
        console.log(`${msgc}`);
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
              // temporarily disabled). The handler will continue to retry if `close()` is not called on the subscription - it is completely up to you
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

    // Waiting long enough before closing the receiver to receive messages
    console.log(`Receiving messages for 60 seconds before exiting...`);
    await delay(60000);

    console.log(`Closing...`);
    await receiver.close();
  } finally {
    await sbClient.close();
  }
}

export default httpTrigger;
