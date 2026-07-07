import Anthropic from '@anthropic-ai/sdk'

// Anthropic() reads ANTHROPIC_API_KEY from env — throws at call time (not import time)
// if unset, since this module is imported by API routes that may load before the key exists.
export function getAnthropicClient() {
  return new Anthropic()
}
