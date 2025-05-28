import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, Switch } from 'react-router-dom';

import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import NewRecording from './pages/NewRecording/NewRecording';
import ProfileSettings from './pages/ProfileSettings/ProfileSettings';
import RecordingLibrary from './pages/RecordingLibrary/RecordingLibrary';
import EditRecording from './pages/EditRecording/EditRecording';

import Signup from './pages/Signup/Signup';
import Welcome from './pages/Welcome/Welcome';
import PhraseList from './pages/PhraseList/PhraseList';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

/**
 * App component with routing setup.
 * Uses Switch to ensure only one route matches.
 * Includes route for /profile.
 * Redirects unknown routes to Welcome page.
 */
const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Switch>
          <Route exact path="/" component={Welcome} />
          <Route exact path="/signup" component={Signup} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/dashboard" component={Dashboard} />
          <Route exact path="/new-recording" component={NewRecording} />
          <Route exact path="/recording-library" component={RecordingLibrary} />

          <Route exact path="/profile" component={ProfileSettings} />
          <Route exact path="/edit-recording" component={EditRecording} />
          <Route exact path="/edit-recording/:id" component={EditRecording} />
          <Route exact path="/phraselist" component={PhraseList} />
          {/* Catch-all route: Redirect to Welcome */}
          <Route render={() => <Redirect to="/" />} />
        </Switch>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
