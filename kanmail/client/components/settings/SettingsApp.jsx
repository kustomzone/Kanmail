import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import HeaderBar from 'components/HeaderBar.jsx';
import Account from 'components/settings/Account.jsx';

import keyboard from 'keyboard.js';

import { post } from 'util/requests.js';


const newAccountState = {
    // Add account phase 1 - name/username/password autoconfig form
    addingAccount: false,
    newAccountName: '',
    newAccountUsername: '',
    newAccountPassword: '',
    newAccountError: null,

    // Add account phase 2 - manual config if auto fails
    isLoadingNewAccount: false,
    configuringNewAccount: false,
    newAccountSettings: null,
}


export default class SettingsApp extends React.Component {
    static propTypes = {
        settings: PropTypes.object.isRequired,
    }

    constructor(props) {
        super(props);

        keyboard.disable();

        this.state = {
            accounts: props.settings.accounts,
            systemSettings: props.settings.system || {},
            styleSettings: props.settings.style || {},
            ...newAccountState,
        };
    }

    resetState = () => {
        this.setState(newAccountState);
    }

    deleteAccount = (accountId) => {
        this.setState({
            accounts: _.omit(this.state.accounts, accountId),
        });
    }

    updateAccount = (accountId, newSettings) => {
        if (!this.state.accounts[accountId]) {
            throw Error('nope');
        }

        const newAccounts = this.state.accounts;
        newAccounts[accountId] = newSettings;

        this.setState({
            accounts: newAccounts,
        });
    }

    completeAddNewAccount = (accountId, newSettings) => {
        const newAccounts = this.state.accounts;
        newAccounts[accountId] = newSettings;

        this.setState({
            accounts: newAccounts,
            ...newAccountState,
        });

        this.reset();
    }

    toggleAddAccount = () => {
        this.setState({
            addingAccount: !this.state.addingAccount,
        });
    }

    handleAddAccount = (ev) => {
        ev.preventDefault();

        if (
            !this.state.newAccountName ||
            !this.state.newAccountUsername ||
            !this.state.newAccountPassword
        ) {
            this.setState({
                newAccountError: 'Missing name, email or password!',
            });
            return;
        }

        if (this.state.accounts[this.state.newAccountName]) {
            this.setState({
                newAccountError: `There is already an account called ${this.state.newAccountName}`,
            });
            return;
        }

        const data = {
            username: this.state.newAccountUsername,
            password: this.state.newAccountPassword,
        };

        const handleSettings = (data) => {
            if (data.connected) {
                this.completeAddNewAccount(
                    this.state.newAccountName,
                    data.settings,
                );
                return;
            }

            this.setState({
                isLoadingNewAccount: false,
                configuringNewAccount: true,
                newAccountSettings: data.settings,
                newAccountError: data.error_message,
                newAccountErrorType: data.error_type,
            });
        }

        this.setState({isLoadingNewAccount: true});

        // Post to new endpoint - hopefully it will autoconfigure and connect itself
        post('/api/settings/account/new', data)
            .then(handleSettings)
            .catch(err => handleSettings(err.data),
        );
    }

    handleUpdate = (stateKey, ev) => {
        this.setState({
            [stateKey]: ev.target.value,
        });
    }

    handleSettingUpdate = (stateKey, key, ev) => {
        const settings = this.state[stateKey];
        settings[key] = ev.target.value;

        this.setState({
            [stateKey]: settings,
        });
    }

    handleSaveSettings = (ev) => {
        ev.preventDefault();

        const newSettings = {
            accounts: this.state.accounts,
            system: this.state.systemSettings,
            style: this.state.styleSettings,
            columns: this.props.settings.columns,
        };

        post('/api/settings', newSettings)
            .then(() => window.close())
            .catch(err => console.log('SETTING ERROR', err));
    }

    renderAccounts() {
        return _.map(this.state.accounts, (accountSettings, accountId) => (
            <Account
                key={accountId}
                accountId={accountId}
                accountSettings={accountSettings}
                deleteAccount={this.deleteAccount}
                updateAccount={this.updateAccount}
            />
        ));
    }

    renderNewAccountForm() {
        if (!this.state.addingAccount) {
            return <button className="submit" onClick={this.toggleAddAccount}>
                Add new account
            </button>;
        }

        if (this.state.configuringNewAccount) {
            return <Account
                key={this.state.newAccountName}
                alwaysEditing={true}
                accountId={this.state.newAccountName}
                accountSettings={this.state.newAccountSettings}
                error={this.state.newAccountError}
                errorType={this.state.newAccountErrorType}
                deleteAccount={this.resetState}
                updateAccount={this.completeAddNewAccount}
            />
        }

        // <button>Add Gmail Account</button>
        // <button>Add Outlook Account</button>

        return <form className="new-account">
            <h3>New Account</h3>
            <div className="error">{this.state.newAccountError}</div>
            <div>
                <label htmlFor="name">Account Name</label>
                <input
                    id="name"
                    value={this.state.newAccountName}
                    onChange={_.partial(this.handleUpdate, 'newAccountName')}
                />
            </div>
            <div>
                <label htmlFor="username">Email</label>
                <input
                    id="username"
                    value={this.state.newAccountUsername}
                    onChange={_.partial(this.handleUpdate, 'newAccountUsername')}
                />
            </div>

            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={this.state.newAccountPassword}
                    onChange={_.partial(this.handleUpdate, 'newAccountPassword')}
                />
            </div>

            <button
                type="submit"
                className={`submit ${this.state.isLoadingNewAccount && 'disabled'}`}
                onClick={this.handleAddAccount}
            >Add Account</button>

            <button className="cancel" onClick={this.toggleAddAccount}>
                <i className="fa fa-times"></i>
            </button>
        </form>;
    }

    render() {
        return (
            <div>
                <HeaderBar />

                <section id="settings">
                    <div id="accounts">
                        <h2>Accounts</h2>
                        <small>changes will not be saved until you save all settings at the bottom of the page</small>
                        {this.renderAccounts()}
                        <div id="add-account">
                            {this.renderNewAccountForm()}
                        </div>
                    </div>

                    <div className="settings" id="style">
                        <h2>General</h2>
                        <label htmlFor="header_background">
                            Header background
                            <small>header background colour</small>
                        </label>
                        <input
                            type="text"
                            id="header_background"
                            value={this.state.styleSettings.header_background}
                            onChange={_.partial(
                                this.handleSettingUpdate,
                                'styleSettings', 'header_background',
                            )}
                        />

                        <label htmlFor="undo_ms">
                            Undo time (ms)
                            <small>length of time to undo actions</small>
                        </label>
                        <input
                            type="number"
                            id="undo_ms"
                            value={this.state.systemSettings.undo_ms}
                            onChange={_.partial(
                                this.handleSettingUpdate,
                                'systemSettings', 'undo_ms',
                            )}
                        />
                    </div>

                    <div className="settings" id="system">
                        <h2>Sync</h2>
                        <label htmlFor="sync_days">
                            Sync days
                            <small>number of days emails to sync</small>
                        </label>
                        <input
                            type="number"
                            id="sync_days"
                            value={this.state.systemSettings.sync_days}
                            onChange={_.partial(
                                this.handleSettingUpdate,
                                'systemSettings', 'sync_days',
                            )}
                        />

                        <label htmlFor="batch_size">
                            Batch size
                            <small>number of emails to fetch at once</small>
                        </label>
                        <input
                            type="number"
                            id="batch_size"
                            value={this.state.systemSettings.batch_size}
                            onChange={_.partial(
                                this.handleSettingUpdate,
                                'systemSettings', 'batch_size',
                            )}
                        />

                        <label htmlFor="initial_batches">
                            Initial batches
                            <small>initial number of batches to fetch</small>
                        </label>
                        <input
                            type="number"
                            id="initial_batches"
                            value={this.state.systemSettings.initial_batches}
                            onChange={_.partial(
                                this.handleSettingUpdate,
                                'systemSettings', 'initial_batches',
                            )}
                        />
                    </div>

                    <button
                        type="submit"
                        className="main-button submit"
                        onClick={this.handleSaveSettings}
                    >Save all settings &rarr;</button>
                </section>
            </div>
        );
    }
}
