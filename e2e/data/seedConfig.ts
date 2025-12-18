import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'data', 'seed-config.yml');

export interface SeedConfig {
  tenant?: {
    email: string;
    password: string;
  };
  project?: {
    slug: string;
    apiKey: string;
  };
}

/**
 * Reads seed configuration from yml file
 */
export function readSeedConfig(): SeedConfig {
  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const fileContents = fs.readFileSync(configPath, 'utf8');
    return (yaml.load(fileContents) as SeedConfig) || {};
  } catch (error) {
    console.warn('⚠️  Failed to read seed-config.yml:', error);
    return {};
  }
}

/**
 * Writes seed configuration to yml file
 */
export function writeSeedConfig(config: SeedConfig): void {
  try {
    const yamlStr = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
    });
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    console.log('✅ Seed configuration saved to seed-config.yml');
  } catch (error) {
    console.error('❌ Failed to write seed-config.yml:', error);
    throw error;
  }
}

/**
 * Updates seed configuration with new values
 */
export function updateSeedConfig(updates: SeedConfig): void {
  const currentConfig = readSeedConfig();
  const newConfig: SeedConfig = {
    ...currentConfig,
    ...updates,
    tenant: updates.tenant ? { ...currentConfig.tenant, ...updates.tenant } : currentConfig.tenant,
    project: updates.project ? { ...currentConfig.project, ...updates.project } : currentConfig.project,
  };
  writeSeedConfig(newConfig);
}
