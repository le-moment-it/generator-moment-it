'use strict';
const { Octokit } = require("@octokit/rest");
const Generator = require('yeoman-generator');
const yosay = require('yosay');

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
        this.name;
        this.description;
        this.terratest;
        this.ci;
        this.create;
        this.repository_description;
        this.private;
        this.failed_github_repository_creation = false;
        this.push_init;
        this.github_user;
    }

    async prompting() {
        this.log(
            yosay('Welcome to the moment-it generator v1.0.0!')
        );

        this.answers = await this.prompt([{
            type: 'input',
            name: 'name',
            message: 'Enter name for the new terraform module : ',
        },

        {
            type: 'input',
            name: 'description',
            message: 'Enter description for the new terraform module : ',
        },

        {
            type: "confirm",
            name: "terratest",
            message: "Would you like to enable the terratest ? : "
        },

        {
            type: "confirm",
            name: "ci",
            message: "Create the Github CI/CD workflow ? :"
        },
        {
            type: "confirm",
            name: "create",
            message: "Do you want to generate the Github repository ? : "
        }
        ]);

        this.name = this.answers.name
        this.description = this.answers.description
        this.terratest = this.answers.terratest
        this.ci = this.answers.ci
        this.create = this.answers.create

        if (this.create) {
            this.answers = await this.prompt([
                {
                    type: 'input',
                    name: 'github_user',
                    message: 'Enter your github user ',
                },
                {
                    type: 'input',
                    name: 'repository_description',
                    message: 'Enter the description of the project : ',
                },
                {
                    type: 'confirm',
                    name: 'private',
                    default: true,
                    message: 'Is your project private ? '
                },
                {
                    type: 'confirm',
                    name: 'push_init',
                    message: 'Do you want to push the generated code to the remote ? :'
                }
            ]);
        }

        this.repository_description = this.answers.repository_description
        this.private = this.answers.private
        this.push_init = this.answers.push_init
        this.github_user = this.answers.github_user

    }

    async configuring() {
        if (this.create) {
            const octokit = new Octokit({
                auth: process.env.GITHUB_TOKEN,
            });

            try {
                await octokit.rest.repos.createForAuthenticatedUser({
                    name: this.name,
                    description: this.description,
                    private: this.private,
                    allow_squash_merge: false,
                    allow_merge_commit: false,
                    allow_rebase_merge: true,
                    auto_init: false
                });
            }
            catch {
                this.log("Creation of the git repository failed, skipping ...")
                this.failed_github_repository_creation = true
            }



        }

    }

    writing() {
        this.destinationRoot(this.name);

        // root folder

        this.fs.copyTpl(
            `${this.templatePath()}/*`,
            this.destinationRoot(), {
            name: this.name,
            description: this.description
        }
        );

        this.fs.copyTpl(
            `${this.templatePath()}/.*`,
            this.destinationRoot(), {
            name: this.name,
            terratest: this.terratest
        }
        );

        this.fs.copyTpl(
            `${this.templatePath()}/example/development/*`,
            `${this.destinationRoot()}/example/development`, {
            name: this.name
        }
        );

        if (this.terratest) {
            this.fs.copyTpl(
                `${this.templatePath()}/tests/development/*.go`,
                `${this.destinationRoot()}/tests`
            );
        }

        // CI/CD folder

        if (this.ci) {
            this.fs.copyTpl(
                `${this.templatePath()}/.github/workflows/*.yml`,
                `${this.destinationRoot()}/.github/workflows`
            );
        }

    }

    install() {
        if (this.push_init) {
            if (this.failed_github_repository_creation) {
                this.log("Push to origin skipped because the Github repository has not been created succesfully")
            }
            else {
                this.spawnCommandSync('git', ['init']);
                this.spawnCommandSync('git', ['remote', 'add', 'origin', "git@github.com:" + this.github_user + "/" + this.name + ".git"]);
                this.spawnCommandSync('git', ['checkout', '-b', 'main'])
                this.spawnCommandSync('git', ['commit', '--allow-empty', '-m', '"empty commit for init"']);
                this.spawnCommandSync('git', ['push', '--set-upstream', 'origin', 'main']);
                this.spawnCommandSync('git', ['checkout', '-b', 'develop'])
                this.spawnCommandSync('git', ['add', '--all']);
                this.spawnCommandSync('git', ['commit', '-m', '"initial commit from generator [skip ci]"']);
                this.spawnCommandSync('git', ['push', '--set-upstream', 'origin', 'develop']);
            }

        }

    }
};