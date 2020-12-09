import { AzureFunction, Context } from "@azure/functions"
import { delay, ProcessErrorArgs, ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";

const serviceBusQueueTrigger: AzureFunction = async function(context: Context, message: any): Promise<void> {
    context.log('ServiceBus queue trigger function processed message', message);
    const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING || "<connection string>";
    const queueName = process.env.QUEUE_NAME_WITH_SESSIONS || "<queue name>";

    
};

async function receiveMessages(sbClient: ServiceBusClient, sessionId: string) {
    // If receiving from a subscription you can use the acceptSession(topic, subscription, sessionId) overload
    const receiver = await sbClient.acceptSession("tslavik", sessionId);
  
    const processMessage = async (message: ServiceBusMessage) => {
      console.log(`Received: ${message.sessionId} - ${JSON.stringify(message.body)} `);
    };
    const processError = async (args: ProcessErrorArgs) => {
      console.log(`>>>>> Error from error source ${args.errorSource} occurred: `, args.error);
    };
    receiver.subscribe({
      processMessage,
      processError
    });
  
    await delay(5000);
  
    await receiver.close();
  }

export default serviceBusQueueTrigger;
