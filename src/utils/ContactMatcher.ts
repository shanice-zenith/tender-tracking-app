import { Contact } from '../types';

/**
 * Normalizes a company name for reliable matching across Google Forms, CSVs, and the Contact Directory.
 * Strips legal entity suffixes (Inc, Ltd, Corp, LLC, Co) and punctuation/whitespace.
 */
export function normalizeCompanyKey(raw: string | undefined | null): string {
    if (!raw || typeof raw !== 'string') return '';
    const cleaned = raw
        .toLowerCase()
        .replace(/\b(inc|incorporated|ltd|limited|corp|corporation|llc|llp|lp|co)\.?\b/gi, ' ')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    if (cleaned.length >= 2) return cleaned;
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Finds an existing Contact in the directory by normalized company name (or email fallback).
 */
export function findMatchingContact(
    contacts: Contact[],
    companyName: string | undefined | null,
    email?: string | undefined | null
): Contact | null {
    if (!Array.isArray(contacts) || contacts.length === 0) return null;

    const targetKey = normalizeCompanyKey(companyName);
    const cleanEmail = (email || '').trim().toLowerCase();

    if (targetKey) {
        const byCompany = contacts.find((c) => {
            const cKey = normalizeCompanyKey(c.company);
            const nKey = normalizeCompanyKey(c.name);
            return (cKey && cKey === targetKey) || (nKey && nKey === targetKey);
        });
        if (byCompany) return byCompany;
    }

    if (cleanEmail && cleanEmail.includes('@')) {
        const byEmail = contacts.find(
            (c) => c.email && c.email.trim().toLowerCase() === cleanEmail
        );
        if (byEmail) return byEmail;
    }

    return null;
}

/**
 * Deduplicates a list of contacts by normalized company key (or email if company is blank),
 * merging categories, phone numbers, and emails into the richest primary record.
 */
export function deduplicateContactsList(contacts: Contact[]): {
    uniqueContacts: Contact[];
    duplicateIdsToDelete: string[];
} {
    const uniqueMap = new Map<string, Contact>();
    const duplicateIdsToDelete: string[] = [];

    const getCategories = (c: Contact): string[] => {
        if (Array.isArray(c.categories) && c.categories.length > 0) return c.categories;
        if (Array.isArray(c.trade_categories) && c.trade_categories.length > 0) return c.trade_categories;
        if (c.category && typeof c.category === 'string') {
            return c.category.split(',').map((s) => s.trim()).filter(Boolean);
        }
        return [];
    };

    const scoreContact = (c: Contact): number => {
        let score = 0;
        if (c.email && c.email.includes('@')) score += 4;
        if (c.phone && c.phone.trim().length > 0) score += 2;
        if (c.company && c.company.trim().length > 0) score += 2;
        if (c.name && c.name.trim() && c.name.trim().toLowerCase() !== (c.company || '').trim().toLowerCase()) score += 1;
        score += getCategories(c).length;
        return score;
    };

    for (const contact of contacts) {
        if (!contact) continue;
        const key =
            normalizeCompanyKey(contact.company || contact.name) ||
            (contact.email ? `email:${contact.email.trim().toLowerCase()}` : `id:${contact.id}`);

        const existing = uniqueMap.get(key);
        if (!existing) {
            uniqueMap.set(key, { ...contact });
            continue;
        }

        const keepExisting = scoreContact(existing) >= scoreContact(contact);
        const primary = keepExisting ? existing : contact;
        const secondary = keepExisting ? contact : existing;

        if (secondary.id && secondary.id !== primary.id) {
            duplicateIdsToDelete.push(secondary.id);
        }

        const mergedCats = Array.from(
            new Set([...getCategories(primary), ...getCategories(secondary)].filter(Boolean))
        );

        uniqueMap.set(key, {
            ...primary,
            company: primary.company?.trim() || secondary.company?.trim() || primary.name,
            name:
                primary.name && primary.name.toLowerCase() !== (primary.company || '').toLowerCase()
                    ? primary.name
                    : secondary.name || primary.name,
            email: primary.email?.trim() || secondary.email?.trim() || '',
            phone: primary.phone?.trim() || secondary.phone?.trim() || '',
            category: mergedCats.join(', ') || primary.category || 'General Contractor',
            categories: mergedCats.length > 0 ? mergedCats : primary.categories,
            trade_categories: mergedCats.length > 0 ? mergedCats : primary.trade_categories,
            notes: primary.notes?.trim() || secondary.notes?.trim() || ''
        });
    }

    return {
        uniqueContacts: Array.from(uniqueMap.values()),
        duplicateIdsToDelete
    };
}