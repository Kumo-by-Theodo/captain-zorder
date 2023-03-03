import {
  ApiGatewayContract,
  HttpStatusCodes,
} from '@swarmion/serverless-contracts';

// move this contract to a shared library once you need to use it outside this service
export const connectAtlasContract = new ApiGatewayContract({
  id: 'atlas-example-health',
  path: '/connect-atlas',
  method: 'GET',
  integrationType: 'restApi',
  outputSchemas: {
    [HttpStatusCodes.OK]: {
      type: 'object',
    } as const,
  },
});
