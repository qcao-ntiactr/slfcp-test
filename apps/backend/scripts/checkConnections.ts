import path from 'path';
import { fileURLToPath } from 'url';

import { PrismaClient } from '@prisma/client';
import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';
import dotenv from 'dotenv';

import * as config from '../api/src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from the root of the backend app
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkDatabase() {
  console.log('Checking Database connection...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    // Perform a simple query to ensure the DB is responsive
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Database connection failed:', errorMessage);
    return false;
  }
}

async function checkBlobStorage() {
  console.log('Checking Blob Storage connection...');
  if (!config.azureBlobStorageConnectionString) {
    console.error('❌ Blob Storage: Connection string missing');
    return false;
  }
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      config.azureBlobStorageConnectionString
    );
    const containerClient = blobServiceClient.getContainerClient(
      config.azureBlobContainerName
    );
    const exists = await containerClient.exists();
    if (exists) {
      console.log(
        `✅ Blob Storage connection and container "${config.azureBlobContainerName}" check successful`
      );
      return true;
    } else {
      console.error(
        `❌ Blob Storage: Container "${config.azureBlobContainerName}" does not exist`
      );
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Blob Storage connection failed:', errorMessage);
    return false;
  }
}

async function checkWorkflowUrl() {
  console.log('Checking Workflow URL reachable...');
  if (!config.azureWorkflowUrl) {
    console.error('❌ Workflow URL: URL missing');
    return false;
  }
  try {
    // Logic Apps endpoints usually return 405 Method Not Allowed for GET, which is fine for a reachability check
    await axios.get(config.azureWorkflowUrl, {
      validateStatus: () => true,
      timeout: 5000,
    });
    console.log('✅ Workflow URL is reachable');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Workflow URL check failed:', errorMessage);
    return false;
  }
}

async function checkLoginGov() {
  console.log('Checking Login.gov endpoints...');
  const endpoints = [
    { name: 'Token', url: config.loginGovTokenEndpoint },
    { name: 'Userinfo', url: config.loginGovUserinfoEndpoint },
    { name: 'JWKS', url: config.loginGovJwksUri },
  ];

  let allOk = true;
  for (const endpoint of endpoints) {
    if (!endpoint.url) {
      console.error(`❌ Login.gov: ${endpoint.name} endpoint missing`);
      allOk = false;
      continue;
    }
    try {
      await axios.get(endpoint.url, {
        validateStatus: () => true,
        timeout: 5000,
      });
      console.log(`✅ Login.gov ${endpoint.name} endpoint is reachable`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Login.gov ${endpoint.name} endpoint check failed:`,
        errorMessage
      );
      allOk = false;
    }
  }
  return allOk;
}

async function checkAppInsights() {
  console.log('Checking Application Insights configuration...');
  if (!config.applicationInsightsConnectionString) {
    console.error('❌ Application Insights: Connection string missing');
    return false;
  }

  if (
    config.applicationInsightsConnectionString.includes(
      'InstrumentationKey='
    ) &&
    config.applicationInsightsConnectionString.includes('IngestionEndpoint=')
  ) {
    console.log(
      '✅ Application Insights connection string format appears valid'
    );
    return true;
  } else {
    console.error('❌ Application Insights: Connection string is malformed');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Connection Health Check...\n');

  const results = await Promise.all([
    checkDatabase(),
    checkBlobStorage(),
    checkWorkflowUrl(),
    checkLoginGov(),
    checkAppInsights(),
  ]);

  console.log('\n--- Summary ---');
  const allPassed = results.every((r) => r === true);
  if (allPassed) {
    console.log('✨ All connections are healthy!');
    process.exit(0);
  } else {
    console.error('⚠️ Some connection checks failed.');
    process.exit(1);
  }
}

main();
