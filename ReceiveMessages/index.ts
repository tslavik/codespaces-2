import { AzureFunction, Context } from "@azure/functions"

const serviceBusQueueTrigger: AzureFunction = async function(context: Context, message: any): Promise<void> {
    context.log('ServiceBus queue trigger function processed message', context.bindings.message);
    
};

export default serviceBusQueueTrigger;
