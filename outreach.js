/**
 * outreach.js
 * Generate personalized LinkedIn/email outreach messages for startup contacts.
 * Uses the Anthropic API (Claude) for generation.
 */

/**
 * Generate a personalized outreach message.
 *
 * @param {Object} opts
 * @param {Object} opts.startup   - { name, description, source }
 * @param {Object} opts.person    - { name, role, linkedin }
 * @param {Array}  opts.techStack - [{ technology }]
 * @param {Object} [opts.sender]  - { name, role, skills: [] } — your own profile
 * @returns {string} The outreach message
 */
function generateOutreachMessage({ startup, person, techStack = [], sender = {} }) {
  const senderName   = sender.name  ?? "[Your Name]";
  const senderRole   = sender.role  ?? "engineer";
  const senderSkills = (sender.skills ?? []).join(", ") || "software development";

  const matchingTech = techStack
    .map(t => t.technology ?? t)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const techLine = matchingTech
    ? `I noticed you're building with ${matchingTech} — areas I work in extensively.`
    : "Your technical approach really stands out.";

  return `Hi ${person.name ?? "there"},

I came across ${startup.name} on ${startup.source ?? "the web"} and was immediately drawn to what you're building${startup.description ? ` — ${startup.description.toLowerCase()}` : ""}.

As a ${senderRole} with experience in ${senderSkills}, I'd love to contribute to your team. ${techLine}

Would you be open to a quick 15-minute conversation?

Best,
${senderName}`;
}

/**
 * Generate messages for all employees of a startup.
 *
 * @param {Object} startup   - Full startup object with employees and techStack arrays
 * @param {Object} sender    - Your profile { name, role, skills: [] }
 * @returns {Array} [{ person, message }]
 */
function generateOutreachForStartup(startup, sender = {}) {
  return (startup.employees ?? []).map(person => ({
    person,
    message: generateOutreachMessage({
      startup,
      person,
      techStack: startup.techStack ?? [],
      sender,
    }),
  }));
}

module.exports = { generateOutreachMessage, generateOutreachForStartup };
