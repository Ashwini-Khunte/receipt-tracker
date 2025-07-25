import { getTemporaryAccessToken } from '@/app/actions/getTemporaryAccessToken';
import SchematicEmbed from './SchematicEmbed';

const SchematicComponents = async ({componentId}: {componentId?: string}) => {

    if(!componentId) {
        return null;
    }

    const accessToken = await getTemporaryAccessToken()
    if(!accessToken) {
        throw new Error("No access token found for user.")
    }

    return <SchematicEmbed accessToken={accessToken} componentId={componentId} />
}

export default SchematicComponents