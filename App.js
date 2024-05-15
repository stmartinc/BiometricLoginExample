import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, Switch, Alert, Dimensions, Keyboard, Modal } from 'react-native';
import { isEnrolledAsync, authenticateAsync } from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export default function App() {

  // login creds
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPassword, setModalPassword] = useState('');

  // holds secure store values - used for bio login instead of the regular login
  const [secureEmail, setSecureEmail] = useState('');
  const [securePassword, setSecurePassword] = useState('');

  // just used to verify login - you'd call an api instead
  const [verifyEmail, setVerifyEmail] = useState('test');
  const [verifyPassword, setVerifyPassword] = useState('123');

  // biometric
  const [bioRecords, setBioRecords] = useState(false); // biometric records saved in device
  const [bioEnabled, setBioEnabled] = useState(false); // biometrics are enabled to login
  const [showBioLogin, setShowBioLogin] = useState(false); // show biometric login vs password login - required bioEnabled = true

  // general state
  const [errorMessage, setErrorMessage] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const alertComponent = (title, message, buttonText) => {
    Alert.alert(
      title,
      message,
      [{ text: buttonText }],
      { cancelable: false }
    );
  }

  // Switch case sets state based on what's returned from secure store
  secureGetItem = async (key) => {
    let result = await SecureStore.getItemAsync(key);
    
    switch (key) {
      case 'email':
        setSecureEmail(result);
        break;
      case 'password':
        setSecurePassword(result);
        break;
      case 'isEnabled':
        if (result === 'true')
          setBioEnabled(true);
        else {
          setBioEnabled(false);
        }
        break;
      default:
        console.log('No key found');
    }
  };
        
  // Save items to secure store
  secureSaveItem = async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  };
  
  // Delete items from secure store
  secureDeleteItem = async (key) => {
    await SecureStore.deleteItemAsync(key);
  };
  
  login = () => {
    if (email === verifyEmail && password === verifyPassword && !showBioLogin) {
      setErrorMessage('');
      setEmail('');
      setPassword('');
      setLoggedIn(true);
    } else {
      setErrorMessage('Invalid login');
    }
    
    if (secureEmail === verifyEmail && securePassword === verifyPassword && showBioLogin) {
      setErrorMessage('');
      setEmail('');
      setPassword('');
      BiometricPrompt();
    } else {
      setErrorMessage('Invalid login');
    }
  }
  
  const BiometricPrompt = async () => {
    // are biometrics saved locally in user's device
    const savedBiometrics = await isEnrolledAsync();
    if (!savedBiometrics) 
      return alertComponent("No biometric records found", "Please login with your password instead", "OK");

    // Authenticate use with Biometrics (Fingerprint, Facial recognition, Iris recognition)
    const biometricLogin = await authenticateAsync({
      promptMessage: "Login with Biometrics",
    });

    setLoggedIn(biometricLogin.success);
  };

  const getRecords = async () => {
    let records = await isEnrolledAsync();
    setBioRecords(records);
  }

  // Get stuff from secure store
  useEffect(() => {
    secureGetItem('isEnabled'); // is it enabled at all
    secureGetItem('email'); // saved email
    secureGetItem('password'); // saved password
    getRecords(); // are there any biometric records saved
  }, [])

  useEffect(() => {
    setShowBioLogin(bioEnabled);
  }, [bioEnabled])

  function loginPage() {
    return (
      !showBioLogin ? (
        <View>
          <Text style={[loggedIn ? styles.saveText : styles.errorText, {alignSelf: 'center', marginBottom: 40}]}>{errorMessage}</Text>
          <Text>Email</Text>
          <TextInput 
            style={styles.textBox}
            onChangeText={(e) => setEmail(e)}
            value={email}
          />
          <Text>Password</Text>
          <TextInput 
            style={styles.textBox}
            onChangeText={(e) => setPassword(e)}
            value={password}
          />
          <Button
            style={styles.button}
            title={"Login"}
            onPress={() => {
              login();
            }}
          />
          {bioEnabled && (
            <Button
              style={styles.button}
              title={"Use Bio Login"}
              onPress={() => {
                setShowBioLogin(true);
              }}
            />
          )}
        </View>
      ) : (
        <View>
          <Text style={[loggedIn ? styles.saveText : styles.errorText, {alignSelf: 'center', marginBottom: 40}]}>{errorMessage}</Text>
          <Text>Email</Text>
          <TextInput 
            style={styles.textBox}
            onChangeText={(e) => setEmail(e)}
            value={secureEmail}
            editable={false}
          />
          <Button
            style={styles.button}
            title={"Biometric Login"}
            onPress={() => {
              login();
            }}
          />
          <Button
            style={styles.button}
            title={"Use Password Login"}
            onPress={() => {
              setShowBioLogin(false);
            }}
          />
        </View>
      )
    )
  }

  function settingsPage() {
    return (
      <View style={styles.contentSpacing}>
        <View style={{alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text>Enable Biometric Login:</Text>
          <Switch
            value={bioEnabled}
            onValueChange={(value) => {
              if(bioEnabled) {
                secureDeleteItem('email');
                secureDeleteItem('password');
                secureDeleteItem('isEnabled');
                setBioEnabled(false);
                return;
              }
              
              if (bioRecords) {
                setModalVisible(true);
              } else {
                alertComponent("No biometric records found", "Please enable them on the device before enabling biometrics here", "OK")
                console.log("error, no biometric records found")
              }

            }}
          />
        </View>
        <View>
          <Text>{bioEnabled ? `Biometrics are currently enabled` : "Biometrics are currently disabled"}</Text>
        </View>
        <Button
          style={styles.button}
          title={"Log out"}
          onPress={() => {
            setErrorMessage('');
            setLoggedIn(false);
          }}
        />

        {/* modal */}
        <Modal
          animationType='slide'
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
            setSecureEmail('');
            setSecurePassword('');
          }}
        >
          <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <View style={{backgroundColor: '#ddd', padding: 20, alignItems: 'center', borderRadius: 15, width: '80%'}}>
              <Text style={[styles.errorText, {alignSelf: 'center', marginBottom: 40}]}>{errorMessage}</Text>
              <Text>Email</Text>
              <TextInput 
                style={[styles.textBox, {width: '100%'}]}
                onChangeText={(e) => setModalEmail(e)}
                value={modalEmail}
              />
              <Text>Password</Text>
              <TextInput 
                style={[styles.textBox, {width: '100%'}]}
                onChangeText={(e) => setModalPassword(e)}
                value={modalPassword}
              />
              <View
                style={{justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', width: '80%'}}
              >
                <Button
                  style={styles.button}
                  title={"Save Login"}
                  onPress={() => {
                    if (modalEmail == 'test' && modalPassword == '123') {
                      secureSaveItem('email', modalEmail);
                      secureSaveItem('password', modalPassword);
                      secureSaveItem('isEnabled', 'enabled');
                      setBioEnabled(true);
                      setErrorMessage('');
                      setEmail('');
                      setPassword('');
                      setModalVisible(!modalVisible);
                    } else {
                      setErrorMessage('Invalid login');
                    }
                  }}
                />
                <Button
                  title='Close'
                  onPress={() => {
                    setModalVisible(!modalVisible);
                    setErrorMessage('');
                  }}
                >
                  Close
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.title}>{loggedIn ? "Edit Saved Credentials" : "Login Page"}</Text>
      </View>

      <View style={styles.contentBox}>
        {!loggedIn && loginPage()}
        {loggedIn && settingsPage()}
      </View>

      <View style={styles.footerBox}>
        <Text style={{marginTop: 50, fontSize: 20, alignSelf: 'center'}}>State</Text>
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'center',
              marginBottom: 20,
              width: '100%',
              gap: 25,
            }}
          >
            <View>
              <Text>Saved email: {secureEmail}</Text>
              <Text>Saved password: {securePassword}</Text>
              <Text>secureEmail: {secureEmail}</Text>
              <Text>securePassword: {securePassword}</Text>
            </View>
            <View>
              <Text>Email: {email}</Text>
              <Text>Password: {password}</Text>
              <Text>Bio enabled: {bioEnabled ? 'true' : 'false'}</Text>
              <Text>Bio Records: {bioRecords ? 'true' : 'false'}</Text>
            </View>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  titleBox: {
    height: 150,
    justifyContent: 'flex-end'
  },
  contentBox: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  footerBox: {
    height: 150,
    marginVertical: 50,
  },
  textBox: {
    backgroundColor: '#ccc',
    marginBottom: 30,
  },
  errorText: {
    color: 'red',
  },
  saveText: {
    color: 'green',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 50,
  },
  contentSpacing: {
    justifyContent: 'space-between', 
    flexGrow: 1, 
    marginTop: 100,
  },
});
