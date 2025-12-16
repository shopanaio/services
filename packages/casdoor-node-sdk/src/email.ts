// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Client } from "./client.js";

interface EmailForm {
  title: string;
  content: string;
  sender: string;
  receivers: string[];
}

/**
 * Send email
 */
export async function sendEmail(
  client: Client,
  title: string,
  content: string,
  sender: string,
  ...receivers: string[]
): Promise<void> {
  const form: EmailForm = {
    title,
    content,
    sender,
    receivers,
  };

  await client.doPost("send-email", null, form, false, false);
}

/**
 * Send email by provider
 */
export async function sendEmailByProvider(
  client: Client,
  title: string,
  content: string,
  sender: string,
  provider: string,
  ...receivers: string[]
): Promise<void> {
  const form: EmailForm = {
    title,
    content,
    sender,
    receivers,
  };

  const providerMap = {
    provider,
  };

  await client.doPost("send-email", providerMap, form, false, false);
}
