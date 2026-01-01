import 'normalize.css';
import { Antd } from '@modules/app/components/Antd';
import { Query } from '@modules/app/components/Query';
import { Session } from '@modules/auth/components/Session';
import { Router } from '@modules/router/components/Router';
import { Rollbar } from '@modules/app/components/Rollbar';
import { UnrecoverableError as Error } from '@components/infra/ErrorBoundary';
import { Intl } from '@src/lang/Intl';
import { Processing } from '@modules/app/components/Processing';
import { Apollo } from '@modules/app/components/Apollo';

export const App = () => {
  return (
    <Rollbar>
      <Apollo>
        <Query>
          <Intl>
            <Error>
              <Session>
                <Antd>
                  <Router />
                  <Processing />
                </Antd>
              </Session>
            </Error>
          </Intl>
        </Query>
      </Apollo>
    </Rollbar>
  );
};
