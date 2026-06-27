import { TagSelector } from '@/types';
import { BaseProvider } from './BaseProvider';

export interface StaticProvider extends BaseProvider {
	mediaSelector: string[];
	sourceSelector: string[] | null;
	tags: TagSelector[] | null;
}
