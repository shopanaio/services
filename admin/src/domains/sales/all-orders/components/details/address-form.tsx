"use client";
import { Flex, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import type { OrderAddressInput } from "../../graphql/operation-types";
const useStyles = createStyles(({ token }) => ({ field: { flex: 1 }, label: { display: "block", marginBottom: token.marginXXS, fontWeight: 500 } }));
const fields: Array<{ key: keyof OrderAddressInput; label: string; placeholder: string }> = [
  { key: "firstName", label: "First name", placeholder: "Enter first name" }, { key: "lastName", label: "Last name", placeholder: "Enter last name" },
  { key: "address1", label: "Address line 1", placeholder: "Street and house number" }, { key: "address2", label: "Address line 2", placeholder: "Apartment, suite, etc." },
  { key: "countryCode", label: "Country", placeholder: "Country code" }, { key: "city", label: "City", placeholder: "City" },
  { key: "province", label: "State / Province", placeholder: "State or province" }, { key: "postalCode", label: "Postal code", placeholder: "Postal code" },
  { key: "email", label: "Email", placeholder: "Email" }, { key: "phone", label: "Phone", placeholder: "Phone" },
];
export const emptyAddress: OrderAddressInput = { firstName: "", lastName: "", address1: "", address2: null, city: "", province: null, postalCode: "", countryCode: "", email: null, phone: null };
export function AddressForm({ value, onChange, readOnly }: { value: OrderAddressInput; onChange: (value: OrderAddressInput) => void; readOnly?: boolean }) { const { styles } = useStyles(); const rows = [fields.slice(0, 2), fields.slice(2, 4), fields.slice(4, 6), fields.slice(6, 8), fields.slice(8, 10)]; return <Flex vertical gap="middle">{rows.map((row, index) => <Flex key={index} gap="middle">{row.map((field) => <div className={styles.field} key={field.key}><Typography.Text className={styles.label}>{field.label}</Typography.Text><Input readOnly={readOnly} value={String(value[field.key] ?? "")} placeholder={field.placeholder} onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} /></div>)}</Flex>)}</Flex>; }
