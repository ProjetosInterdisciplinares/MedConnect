"use client"

export interface ServiceError {
	isError: true
	status: number
	message: string
}

export type ServiceResult<T> = T | ServiceError

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export function buildUrl(path: string): string {
	if (!API_BASE) {
		throw new Error("NEXT_PUBLIC_API_URL não está definida")
	}

	return `${API_BASE}${path}`
}

export function getAuthHeaders(): HeadersInit {
	const token = localStorage.getItem("token")

	return {
		"Content-Type": "application/json",
		Authorization: token ? `Bearer ${token}` : "",
	}
}

export function getJsonHeaders(): HeadersInit {
	return {
		"Content-Type": "application/json",
	}
}

async function extractMessage(response: Response, fallback: string): Promise<string> {
	try {
		const data = await response.json() as {
			error?: string
			detail?: string
			message?: string
			erro?: string
		}

		return data.error || data.detail || data.message || data.erro || fallback
	} catch {
		return fallback
	}
}

export async function handleResponse<T>(
	response: Response,
	fallbackMessage: string
): Promise<ServiceResult<T>> {
	if (!response.ok) {
		return {
			isError: true,
			status: response.status,
			message: await extractMessage(response, fallbackMessage),
		}
	}

	if (response.status === 204) {
		return {} as T
	}

	return await response.json() as T
}
